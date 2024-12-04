import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from './test-utils';
import { useChatState } from '../hooks/use-chat-state';
import { useChatWebSocket } from '../hooks/use-chat-websocket';

// Mock the auth hook
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'user-123',
      },
    },
  }),
}));

// Mock the chat websocket hook
const mockWebSocket = {
  isConnected: true,
  sendMessage: vi.fn(),
  notifyTypingStart: vi.fn(),
  notifyTypingEnd: vi.fn(),
  markMessageAsDelivered: vi.fn(),
  markMessageAsRead: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  onMessage: vi.fn(),
  onTypingStart: vi.fn(),
  onTypingEnd: vi.fn(),
  onUserJoined: vi.fn(),
  onUserLeft: vi.fn(),
};

vi.mock('../hooks/use-chat-websocket', () => ({
  useChatWebSocket: () => mockWebSocket,
}));

describe('useChatState', () => {
  const mockUserId = 'user-123';
  const mockChatId = 'chat-123';
  const mockChat = {
    id: mockChatId,
    name: 'Test Chat',
    participants: [mockUserId],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.sendMessage.mockResolvedValue(undefined);
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useChatState(mockChat));

    expect(result.current).toEqual(expect.objectContaining({
      messages: [],
      typingUsers: new Set(),
      participants: new Set(),
      isLoading: false,
      error: null,
      isConnected: true,
    }));
  });

  describe('Message Management', () => {
    it('should handle sending messages', async () => {
      const { result } = renderHook(() => useChatState(mockChat));

      await act(async () => {
        await result.current.sendMessage('Hello, world!');
      });

      expect(mockWebSocket.sendMessage).toHaveBeenCalledWith(
        'new_message',
        expect.objectContaining({
          chatId: mockChatId,
          content: 'Hello, world!',
        })
      );

      // Check optimistic update
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(expect.objectContaining({
        content: 'Hello, world!',
        chatId: mockChatId,
        userId: 'user-123',
      }));
    });

    it('should handle message send failures', async () => {
      const error = new Error('Failed to send message');
      mockWebSocket.sendMessage.mockRejectedValueOnce(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useChatState(mockChat, { onError }));

      await act(async () => {
        try {
          await result.current.sendMessage('Hello, world!');
        } catch (e) {
          // Expected error
        }
        // Wait for state updates
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.messages).toHaveLength(0);
    });

    it('should handle updating messages', async () => {
      const { result } = renderHook(() => useChatState(mockChat));

      await act(async () => {
        result.current.updateMessage('message-123', 'Updated content');
      });

      expect(mockWebSocket.sendMessage).toHaveBeenCalledWith(
        'update_message',
        {
          chatId: mockChatId,
          messageId: 'message-123',
          content: 'Updated content',
        }
      );
    });

    it('should handle deleting messages', async () => {
      const { result } = renderHook(() => useChatState(mockChat));

      await act(async () => {
        result.current.deleteMessage('message-123');
      });

      expect(mockWebSocket.sendMessage).toHaveBeenCalledWith(
        'delete_message',
        {
          chatId: mockChatId,
          messageId: 'message-123',
        }
      );
    });
  });

  describe('Typing Indicators', () => {
    it('should handle typing start', async () => {
      const { result } = renderHook(() => useChatState(mockChat));

      await act(async () => {
        result.current.handleTypingStart();
      });

      expect(mockWebSocket.notifyTypingStart).toHaveBeenCalled();
    });

    it('should handle typing end after timeout', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useChatState(mockChat));

      await act(async () => {
        result.current.handleTypingStart();
      });

      expect(mockWebSocket.notifyTypingStart).toHaveBeenCalled();

      // Fast-forward 3 seconds
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockWebSocket.notifyTypingEnd).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should track typing users', async () => {
      const { result } = renderHook(() => useChatState(mockChatId));

      // Simulate typing start event
      act(() => {
        mockWebSocket.on.mock.calls.find(([event]) => event === 'typingStart')?.[1]({
          userId: 'other-user',
          chatId: mockChatId,
        });
      });

      // Wait for state update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.typingUsers).toContain('other-user');
    });
  });

  describe('Participant Management', () => {
    it('should track chat participants', async () => {
      const { result } = renderHook(() => useChatState(mockChatId));

      // Simulate user joined event
      act(() => {
        mockWebSocket.on.mock.calls.find(([event]) => event === 'userJoined')?.[1]({
          userId: 'new-user',
          chatId: mockChatId,
        });
      });

      // Wait for state update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.participants).toContain('new-user');
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors', async () => {
      const onError = vi.fn();
      const error = new Error('WebSocket error');

      const { result } = renderHook(() => useChatState(mockChatId));

      // Set up error handler
      result.current.onError(onError);

      // Simulate WebSocket error
      act(() => {
        mockWebSocket.on.mock.calls.find(([event]) => event === 'error')?.[1](error);
      });

      // Wait for error handler to be called
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should handle message send failures', async () => {
      const error = new Error('Failed to send message');
      mockWebSocket.sendMessage.mockRejectedValueOnce(error);
      const onError = vi.fn();
      const { result } = renderHook(() => useChatState(mockChat, { onError }));

      await act(async () => {
        try {
          await result.current.sendMessage('Test message').catch(() => {});
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.messages).toHaveLength(0);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
