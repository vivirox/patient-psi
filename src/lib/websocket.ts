import { Server } from 'ws';
import { parse } from 'url';
import { verify } from 'jsonwebtoken';
import { env } from './env';
import * as db from './db';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface ChatClient {
  userId: string;
  chatId?: string;
  ws: WebSocket;
  lastActivity: Date;
}

interface TypingStatusPayload {
  userId: string;
  chatId: string;
}

export class ChatWebSocketServer {
  private wss: Server;
  private clients: Map<string, ChatClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly CLIENT_TIMEOUT = 60000;

  constructor(server: any) {
    this.wss = new Server({ server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, userId) => {
        if (now - client.lastActivity.getTime() > this.CLIENT_TIMEOUT) {
          console.log(`Client ${userId} timed out`);
          client.ws.close(1000, 'Connection timed out');
          this.clients.delete(userId);
        } else {
          try {
            client.ws.send(JSON.stringify({ type: 'ping' }));
          } catch (error) {
            console.error(`Failed to send ping to client ${userId}:`, error);
            this.clients.delete(userId);
          }
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleNewConnection(ws, req);
    });
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
    this.clients.clear();
  }

  private handleNewConnection(ws: WebSocket, req: any) {
    try {
      const token = this.extractToken(req);
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      const userId = this.authenticateUser(token);
      if (!userId) {
        ws.close(1008, 'Invalid authentication');
        return;
      }

      // Close existing connection if user reconnects
      const existingClient = this.clients.get(userId);
      if (existingClient) {
        existingClient.ws.close(1000, 'New connection established');
        this.clients.delete(userId);
      }

      const client: ChatClient = { 
        userId, 
        ws,
        lastActivity: new Date()
      };
      this.clients.set(userId, client);

      ws.on('message', (data: string) => {
        client.lastActivity = new Date();
        this.handleMessage(client, data);
      });

      ws.on('close', () => this.handleDisconnect(client));
      ws.on('error', (error) => this.handleError(client, error));
      ws.on('pong', () => {
        client.lastActivity = new Date();
      });

      // Send initial connection success message
      this.sendToClient(client, {
        type: 'connection_established',
        payload: { userId },
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  private extractToken(req: any): string | null {
    const { query } = parse(req.url || '', true);
    return (query.token as string) || null;
  }

  private authenticateUser(token: string): string | null {
    try {
      const decoded = verify(token, env.AUTH_SECRET) as { sub: string };
      return decoded.sub;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  private async handleMessage(client: ChatClient, data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'join_chat':
          await this.handleJoinChat(client, message.payload);
          break;
        case 'leave_chat':
          await this.handleLeaveChat(client);
          break;
        case 'typing_start':
          await this.handleTypingStart(client);
          break;
        case 'typing_end':
          await this.handleTypingEnd(client);
          break;
        case 'message_delivered':
          await this.handleMessageDelivered(client, message.payload);
          break;
        case 'message_read':
          await this.handleMessageRead(client, message.payload);
          break;
        case 'pong':
          // Handle client pong response
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Message handling error:', error);
      this.sendToClient(client, {
        type: 'error',
        payload: { message: 'Failed to process message' },
      });
    }
  }

  private async handleJoinChat(client: ChatClient, payload: { chatId: string }) {
    const { chatId } = payload;
    
    // Clear previous chat's typing status if exists
    if (client.chatId) {
      await db.clearTypingStatus(client.chatId, client.userId);
    }
    
    client.chatId = chatId;

    // Notify other participants that user joined
    this.broadcastToChatParticipants(chatId, {
      type: 'user_joined',
      payload: { userId: client.userId, chatId },
    }, client.userId);

    // Send current typing users
    const typingUsers = await db.getTypingUsers(chatId);
    this.sendToClient(client, {
      type: 'typing_status',
      payload: { users: typingUsers },
    });
  }

  private async handleLeaveChat(client: ChatClient) {
    if (!client.chatId) return;

    const chatId = client.chatId;
    
    // Clear typing status when leaving chat
    await db.clearTypingStatus(chatId, client.userId);
    
    client.chatId = undefined;

    // Notify other participants that user left
    this.broadcastToChatParticipants(chatId, {
      type: 'user_left',
      payload: { userId: client.userId, chatId },
    }, client.userId);
  }

  private async handleTypingStart(client: ChatClient) {
    if (!client.chatId) return;

    await db.updateTypingStatus(client.chatId, client.userId);
    
    // Broadcast typing status to all chat participants
    const typingUsers = await db.getTypingUsers(client.chatId);
    this.broadcastToChatParticipants(client.chatId, {
      type: 'typing_status',
      payload: { users: typingUsers },
    });
  }

  private async handleTypingEnd(client: ChatClient) {
    if (!client.chatId) return;

    await db.clearTypingStatus(client.chatId, client.userId);
    
    // Broadcast updated typing status to all chat participants
    const typingUsers = await db.getTypingUsers(client.chatId);
    this.broadcastToChatParticipants(client.chatId, {
      type: 'typing_status',
      payload: { users: typingUsers },
    });
  }

  private async handleMessageDelivered(client: ChatClient, payload: { messageId: string }) {
    const { messageId } = payload;
    await db.markMessageAsDelivered(messageId);
    
    if (client.chatId) {
      this.broadcastToChatParticipants(client.chatId, {
        type: 'message_delivered',
        payload: { messageId, userId: client.userId },
      });
    }
  }

  private async handleMessageRead(client: ChatClient, payload: { messageId: string }) {
    const { messageId } = payload;
    await db.markMessageAsRead(messageId);
    
    if (client.chatId) {
      this.broadcastToChatParticipants(client.chatId, {
        type: 'message_read',
        payload: { messageId, userId: client.userId },
      });
    }
  }

  private async handleDisconnect(client: ChatClient) {
    if (client.chatId) {
      await this.handleLeaveChat(client);
    }
    this.clients.delete(client.userId);
  }

  private handleError(client: ChatClient, error: Error) {
    console.error('WebSocket error for client', client.userId, ':', error);
    this.sendToClient(client, {
      type: 'error',
      payload: { message: 'Internal WebSocket error' },
    });
  }

  private sendToClient(client: ChatClient, message: WebSocketMessage) {
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message to client:', error);
      this.clients.delete(client.userId);
    }
  }

  private broadcastToChatParticipants(
    chatId: string,
    message: WebSocketMessage,
    excludeUserId?: string
  ) {
    this.clients.forEach((client) => {
      if (
        client.chatId === chatId &&
        (!excludeUserId || client.userId !== excludeUserId)
      ) {
        this.sendToClient(client, message);
      }
    });
  }
}

let wsServer: ChatWebSocketServer | null = null;

export function initializeWebSocketServer(server: any) {
  if (!wsServer) {
    wsServer = new ChatWebSocketServer(server);
  }
  return wsServer;
}

export function getWebSocketServer(): ChatWebSocketServer | null {
  return wsServer;
}
