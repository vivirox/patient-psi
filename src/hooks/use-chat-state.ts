import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './use-auth';
import { useChatWebSocket } from './use-chat-websocket';
import { Message, Chat } from '../types/chat';
import { useLocalStorage } from './use-local-storage';

interface UseChatStateOptions {
  onError?: (error: Error) => void;
  onMessageSent?: (message: Message) => void;
  onMessageReceived?: (message: Message) => void;
}

interface ChatState {
  messages: Message[];
  typingUsers: Set<string>;
  participants: Set<string>;
  isLoading: boolean;
  error: Error | null;
  lastReadMessageId: string | null;
}

const TYPING_TIMEOUT = 3000; // 3 seconds
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

export function useChatState(chat: Chat | null, options: UseChatStateOptions = {}) {
  const { session } = useAuth();
  const [state, setState] = useState<ChatState>({
    messages: [],
    typingUsers: new Set(),
    participants: new Set(),
    isLoading: false,
    error: null,
    lastReadMessageId: null,
  });

  // Store last read message ID in local storage per chat
  const [lastReadMessageId, setLastReadMessageId] = useLocalStorage<string | null>(
    chat ? `chat-${chat.id}-last-read` : null,
    null
  );

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const optimisticUpdatesRef = useRef(new Set<string>());
  const retryAttemptsRef = useRef<Record<string, number>>({});

  // WebSocket connection and handlers
  const webSocket = useChatWebSocket(chat?.id ?? null);

  useEffect(() => {
    if (!webSocket) return;

    const handleTypingStart = (userId: string) => {
      setState((prev) => ({
        ...prev,
        typingUsers: new Set([...prev.typingUsers, userId]),
      }));

      // Clear typing indicator after timeout
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          typingUsers: new Set([...prev.typingUsers].filter((id) => id !== userId)),
        }));
      }, TYPING_TIMEOUT);
    };

    const handleTypingEnd = (userId: string) => {
      setState((prev) => ({
        ...prev,
        typingUsers: new Set([...prev.typingUsers].filter((id) => id !== userId)),
      }));
    };

    const handleUserJoin = (userId: string) => {
      setState((prev) => ({
        ...prev,
        participants: new Set([...prev.participants, userId]),
      }));
    };

    const handleUserLeave = (userId: string) => {
      setState((prev) => ({
        ...prev,
        participants: new Set([...prev.participants].filter((id) => id !== userId)),
      }));
    };

    const handleError = (error: Error) => {
      setState((prev) => ({ ...prev, error }));
      options.onError?.(error);
    };

    webSocket.on('typing_start', handleTypingStart);
    webSocket.on('typing_end', handleTypingEnd);
    webSocket.on('user_join', handleUserJoin);
    webSocket.on('user_leave', handleUserLeave);
    webSocket.on('error', handleError);

    return () => {
      webSocket.off('typing_start', handleTypingStart);
      webSocket.off('typing_end', handleTypingEnd);
      webSocket.off('user_join', handleUserJoin);
      webSocket.off('user_leave', handleUserLeave);
      webSocket.off('error', handleError);
    };
  }, [webSocket, options.onError]);

  // Message handlers
  const handleNewMessage = useCallback((message: Message) => {
    // Ignore optimistically added messages
    if (optimisticUpdatesRef.current.has(message.id)) {
      optimisticUpdatesRef.current.delete(message.id);
      return;
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));

    // Mark message as delivered if from another user
    if (message.userId !== session?.user.id) {
      webSocket.markMessageAsDelivered(message.id);
      options.onMessageReceived?.(message);
    }
  }, [session?.user.id, options]);

  const handleMessageUpdate = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
    }));
  }, []);

  const handleMessageDelete = useCallback((messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== messageId),
    }));
  }, []);

  const handleMessageError = useCallback((payload: { messageId: string; error: string }) => {
    const { messageId, error } = payload;
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === messageId ? { ...m, error } : m)),
    }));
    options.onError?.(new Error(`Message error: ${error}`));
  }, [options]);

  // Retry logic for failed messages
  const retryMessage = useCallback((message: Message) => {
    const retryCount = retryAttemptsRef.current[message.id] || 0;
    if (retryCount >= MAX_RETRIES) {
      handleMessageError({
        messageId: message.id,
        error: 'Max retry attempts reached',
      });
      return;
    }

    retryAttemptsRef.current[message.id] = retryCount + 1;
    setTimeout(() => {
      webSocket.sendMessage('new_message', {
        chatId: chat?.id,
        messageId: message.id,
        content: message.content,
        retryAttempt: retryCount + 1,
      });
    }, RETRY_DELAY * Math.pow(2, retryCount));
  }, [chat?.id, webSocket, handleMessageError]);

  // Typing indicator handlers
  const handleTypingStart = useCallback(() => {
    if (!chat) return;

    webSocket.notifyTypingStart();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      webSocket.notifyTypingEnd();
    }, TYPING_TIMEOUT);
  }, [chat, webSocket]);

  // Message actions
  const sendChatMessage = useCallback(async (content: string) => {
    if (!session?.user.id || !chat?.id) {
      throw new Error('Cannot send message: no active session or chat');
    }

    const message: Message = {
      id: crypto.randomUUID(),
      chatId: chat.id,
      userId: session.user.id,
      content,
      timestamp: new Date().toISOString(),
      deliveredAt: null,
    };

    try {
      setState((prev) => ({
        ...prev,
        error: null,
        messages: [...prev.messages, message],
      }));

      await webSocket.sendMessage('new_message', {
        chatId: chat.id,
        messageId: message.id,
        content,
      });

      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === message.id ? { ...m, deliveredAt: new Date().toISOString() } : m
        ),
      }));

      options.onMessageSent?.(message);
    } catch (error) {
      if (error instanceof Error) {
        setState((prev) => ({
          ...prev,
          error,
          messages: prev.messages.filter((m) => m.id !== message.id),
        }));
        options.onError?.(error);
        throw error;
      }
    }
  }, [session?.user.id, chat?.id, webSocket, options]);

  const updateMessage = useCallback((messageId: string, content: string) => {
    if (!chat) return;

    // Update optimistically
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, content, updatedAt: new Date() } : m
      ),
    }));

    webSocket.sendMessage('update_message', {
      chatId: chat.id,
      messageId,
      content,
    });
  }, [chat, webSocket]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!chat) return;

    // Delete optimistically
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== messageId),
    }));

    webSocket.sendMessage('delete_message', {
      chatId: chat.id,
      messageId,
    });
  }, [chat, webSocket]);

  // Mark messages as read
  useEffect(() => {
    if (!chat || !session || state.messages.length === 0) return;

    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage.id !== lastReadMessageId &&
      lastMessage.userId !== session.user.id
    ) {
      webSocket.markMessageAsRead(lastMessage.id);
      setLastReadMessageId(lastMessage.id);
    }
  }, [chat, session, state.messages, lastReadMessageId, webSocket, setLastReadMessageId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    isConnected: webSocket.isConnected,
    lastReadMessageId,
    sendMessage: sendChatMessage,
    updateMessage,
    deleteMessage,
    handleTypingStart,
    markMessageAsRead: webSocket.markMessageAsRead,
  };
}
