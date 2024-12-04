import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import WS from 'jest-websocket-mock';
import { ChatWebSocketServer } from '../lib/websocket';
import { db } from '../lib/db';
import { env } from '../lib/env';

describe('ChatWebSocketServer', () => {
  let server: WS;
  let wsServer: ChatWebSocketServer;
  const TEST_PORT = 1234;
  const TEST_URL = `ws://localhost:${TEST_PORT}`;
  const mockToken = 'mock-token';
  const mockUserId = 'user-123';
  const mockChatId = 'chat-123';

  beforeAll(async () => {
    // Mock environment and dependencies
    vi.mock('../lib/env', () => ({
      env: {
        AUTH_SECRET: 'test-secret',
      },
    }));

    vi.mock('../lib/db', () => ({
      db: {
        updateTypingStatus: vi.fn(),
        markMessageAsDelivered: vi.fn(),
        markMessageAsRead: vi.fn(),
        getTypingUsers: vi.fn().mockResolvedValue([]),
      },
    }));

    // Mock ws Server
    vi.mock('ws', () => ({
      Server: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        close: vi.fn(),
        clients: new Set(),
      })),
    }));

    // Create WebSocket mock server
    server = new WS(TEST_URL);
    
    // Create a mock HTTP server for the WebSocket server
    const mockHttpServer = {
      address: () => ({ port: TEST_PORT }),
      on: vi.fn(),
      close: vi.fn(),
    };
    wsServer = new ChatWebSocketServer(mockHttpServer);

    // Wait for server to be ready
    await server.connected;
  });

  afterAll(async () => {
    if (wsServer) {
      wsServer.close();
    }
    WS.clean();
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    // No-op
  });

  afterEach(async () => {
    // No-op
  });

  describe('Connection Management', () => {
    it('should authenticate and establish connection with valid token', async () => {
      const client = new WebSocket(`${TEST_URL}?token=${mockToken}`);
      await server.connected;

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'connection_established',
        payload: { userId: mockUserId },
      });
    });

    it('should reject connection with invalid token', async () => {
      const client = new WebSocket(`${TEST_URL}?token=invalid-token`);
      
      await expect(server.connected).rejects.toThrow();
    });
  });

  describe('Chat Room Management', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = new WebSocket(`${TEST_URL}?token=${mockToken}`);
      await server.connected;
      await server.nextMessage; // Skip connection established message
    });

    it('should handle joining a chat room', async () => {
      client.send(JSON.stringify({
        type: 'join_chat',
        payload: { chatId: mockChatId },
      }));

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'user_joined',
        payload: { userId: mockUserId, chatId: mockChatId },
      });
    });

    it('should handle leaving a chat room', async () => {
      // First join the room
      client.send(JSON.stringify({
        type: 'join_chat',
        payload: { chatId: mockChatId },
      }));
      await server.nextMessage;

      // Then leave it
      client.send(JSON.stringify({
        type: 'leave_chat',
        payload: { chatId: mockChatId },
      }));

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'user_left',
        payload: { userId: mockUserId, chatId: mockChatId },
      });
    });
  });

  describe('Typing Indicators', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = new WebSocket(`${TEST_URL}?token=${mockToken}`);
      await server.connected;
      await server.nextMessage;

      // Join chat room
      client.send(JSON.stringify({
        type: 'join_chat',
        payload: { chatId: mockChatId },
      }));
      await server.nextMessage;
    });

    it('should handle typing start notification', async () => {
      client.send(JSON.stringify({
        type: 'typing_start',
        payload: { chatId: mockChatId },
      }));

      expect(db.updateTypingStatus).toHaveBeenCalledWith(
        mockChatId,
        mockUserId,
        true
      );

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'typing_start',
        payload: { userId: mockUserId },
      });
    });

    it('should handle typing end notification', async () => {
      client.send(JSON.stringify({
        type: 'typing_end',
        payload: { chatId: mockChatId },
      }));

      expect(db.updateTypingStatus).toHaveBeenCalledWith(
        mockChatId,
        mockUserId,
        false
      );

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'typing_end',
        payload: { userId: mockUserId },
      });
    });
  });

  describe('Message Status Updates', () => {
    let client: WebSocket;
    const mockMessageId = 'message-123';

    beforeEach(async () => {
      client = new WebSocket(`${TEST_URL}?token=${mockToken}`);
      await server.connected;
      await server.nextMessage;
    });

    it('should handle message delivered status', async () => {
      client.send(JSON.stringify({
        type: 'message_delivered',
        payload: { messageId: mockMessageId },
      }));

      expect(db.markMessageAsDelivered).toHaveBeenCalledWith(mockMessageId);
    });

    it('should handle message read status', async () => {
      client.send(JSON.stringify({
        type: 'message_read',
        payload: { messageId: mockMessageId },
      }));

      expect(db.markMessageAsRead).toHaveBeenCalledWith(mockMessageId);
    });
  });

  describe('Error Handling', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = new WebSocket(`${TEST_URL}?token=${mockToken}`);
      await server.connected;
      await server.nextMessage;
    });

    it('should handle invalid message format', async () => {
      client.send('invalid json');

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'error',
        payload: { message: 'Failed to process message' },
      });
    });

    it('should handle unknown message type', async () => {
      client.send(JSON.stringify({
        type: 'unknown_type',
        payload: {},
      }));

      const message = await server.nextMessage;
      expect(JSON.parse(message)).toEqual({
        type: 'error',
        payload: { message: 'Unknown message type' },
      });
    });
  });
});
