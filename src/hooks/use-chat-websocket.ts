import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './use-auth';
import { env } from '../lib/env';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface TypingStatus {
  users: string[];
}

interface UseChatWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onTypingStatusChange?: (users: string[]) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
  onConnectionStateChange?: (isConnected: boolean) => void;
}

export function useChatWebSocket(chatId: string | null, options: UseChatWebSocketOptions = {}) {
  const { session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 2000;
  const HEARTBEAT_INTERVAL = 30000;

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    setIsConnected(false);
  }, []);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'pong' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const connect = useCallback(() => {
    if (!session?.token || !chatId) return;

    cleanup();

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${session.token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        options.onConnectionStateChange?.(true);
        startHeartbeat();
        
        // Join the chat room
        ws.send(JSON.stringify({
          type: 'join_chat',
          payload: { chatId },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            case 'typing_status':
              options.onTypingStatusChange?.(message.payload.users);
              break;
            case 'user_joined':
              options.onUserJoined?.(message.payload.userId);
              break;
            case 'user_left':
              options.onUserLeft?.(message.payload.userId);
              break;
            case 'error':
              options.onError?.(new Error(message.payload.message));
              break;
            default:
              options.onMessage?.(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        cleanup();

        // Don't reconnect if the closure was clean (code 1000)
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
            options.onReconnect?.();
          }, RECONNECT_INTERVAL * Math.pow(2, reconnectAttemptsRef.current));
        }
        
        options.onConnectionStateChange?.(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(new Error('WebSocket connection error'));
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      options.onError?.(new Error('Failed to create WebSocket connection'));
      cleanup();
    }
  }, [session?.token, chatId, options, cleanup, startHeartbeat]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket is not connected');
      options.onError?.(new Error('Cannot send message: WebSocket is not connected'));
    }
  }, [options]);

  const notifyTypingStart = useCallback(() => {
    if (chatId) {
      sendMessage('typing_start', { chatId });
    }
  }, [sendMessage, chatId]);

  const notifyTypingEnd = useCallback(() => {
    if (chatId) {
      sendMessage('typing_end', { chatId });
    }
  }, [sendMessage, chatId]);

  const markMessageAsDelivered = useCallback((messageId: string) => {
    sendMessage('message_delivered', { messageId });
  }, [sendMessage]);

  const markMessageAsRead = useCallback((messageId: string) => {
    sendMessage('message_read', { messageId });
  }, [sendMessage]);

  return {
    isConnected,
    sendMessage,
    notifyTypingStart,
    notifyTypingEnd,
    markMessageAsDelivered,
    markMessageAsRead,
  };
}
