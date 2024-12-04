import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Message } from './chat-message';
import { ChatContainer } from './chat-container';

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface ChatClientProps {
  initialChats: Chat[];
  patientId: string;
}

interface WebSocketMessage {
  type: 'typing' | 'message' | 'edit' | 'delete';
  chatId: string;
  userId: string;
  data: any;
}

export function ChatClient({ initialChats, patientId }: ChatClientProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket connection
  useEffect(() => {
    if (!selectedChatId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const connect = () => {
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/ws?token=${token}`
      );

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'typing':
              if (message.data.isTyping) {
                setTypingUsers((prev) => new Set(prev).add(message.userId));
              } else {
                setTypingUsers((prev) => {
                  const next = new Set(prev);
                  next.delete(message.userId);
                  return next;
                });
              }
              break;

            case 'message':
              setMessages((prev) => [...prev, message.data.message]);
              break;

            case 'edit':
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === message.data.message.id ? message.data.message : msg
                )
              );
              break;

            case 'delete':
              setMessages((prev) =>
                prev.filter((msg) => msg.id !== message.data.messageId)
              );
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connect, 1000 * Math.pow(2, reconnectAttempts.current));
        } else {
          toast.error('Failed to maintain connection. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error. Attempting to reconnect...');
      };

      wsRef.current = ws;
      reconnectAttempts.current = 0;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedChatId]);

  // Notify typing status
  const notifyTyping = useCallback(() => {
    if (!wsRef.current || !selectedChatId) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error('User ID not found');
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          chatId: selectedChatId,
          userId,
          data: { isTyping: true },
        })
      );

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to clear typing status
      typingTimeoutRef.current = setTimeout(() => {
        if (!wsRef.current) return;

        wsRef.current.send(
          JSON.stringify({
            type: 'typing',
            chatId: selectedChatId,
            userId,
            data: { isTyping: false },
          })
        );
      }, 3000);
    } catch (error) {
      console.error('Failed to send typing notification:', error);
    }
  }, [selectedChatId]);

  const createChat = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/chats`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create chat');
      }

      const chat = await response.json();
      setChats((prev) => [chat, ...prev]);
      setSelectedChatId(chat.id);
      setMessages([]);
      toast.success('New chat created');
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
    }
  }, [patientId]);

  const selectChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/chats/${chatId}/messages`);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch messages');
      }

      const messages = await response.json();
      setSelectedChatId(chatId);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load chat messages');
    }
  }, [patientId]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete chat');
      }

      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(undefined);
        setMessages([]);
      }
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  }, [patientId, selectedChatId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedChatId) return;

    try {
      setIsGenerating(true);

      // Add user message optimistically
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content,
        role: 'user',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Set up SSE for streaming response
      const eventSource = new EventSource(
        `/api/patients/${patientId}/chats/${selectedChatId}/messages?content=${encodeURIComponent(
          content
        )}`
      );

      let currentAiMessage = '';

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.token) {
            // Update streaming message
            currentAiMessage += data.token;
            setMessages((prev) => [
              ...prev.slice(0, -1),
              {
                id: 'streaming',
                content: currentAiMessage,
                role: 'assistant',
                createdAt: new Date(),
                isStreaming: true,
              },
            ]);
          } else {
            // Final message
            setMessages((prev) => [...prev.slice(0, -1), data]);
            eventSource.close();
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
          eventSource.close();
          toast.error('Failed to process response');
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        setIsGenerating(false);
        toast.error('Failed to generate response');
      };

      // Update chat list
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChatId
            ? {
                ...chat,
                messageCount: chat.messageCount + 2,
                updatedAt: new Date(),
              }
            : chat
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistically added message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.content !== content)
      );
      toast.error('Failed to send message');
    } finally {
      setIsGenerating(false);
    }
  }, [patientId, selectedChatId]);

  const editMessage = useCallback(async (message: Message) => {
    if (!selectedChatId) return;

    try {
      const response = await fetch(
        `/api/patients/${patientId}/chats/${selectedChatId}/messages/${message.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message.content }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to edit message');
      }

      const { message: updatedMessage, aiMessage } = await response.json();

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === message.id) return updatedMessage;
          if (aiMessage && msg.id === aiMessage.id) return aiMessage;
          return msg;
        })
      );
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  }, [patientId, selectedChatId]);

  const deleteMessage = useCallback(async (message: Message) => {
    if (!selectedChatId) return;

    try {
      const response = await fetch(
        `/api/patients/${patientId}/chats/${selectedChatId}/messages/${message.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete message');
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChatId
            ? { ...chat, messageCount: chat.messageCount - 1 }
            : chat
        )
      );
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  }, [patientId, selectedChatId]);

  const clearHistory = useCallback(async () => {
    if (!selectedChatId) return;

    try {
      const response = await fetch(
        `/api/patients/${patientId}/chats/${selectedChatId}/messages`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to clear history');
      }

      setMessages([]);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChatId
            ? { ...chat, messageCount: 0 }
            : chat
        )
      );
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error('Failed to clear chat history');
    }
  }, [patientId, selectedChatId]);

  return (
    <ChatContainer
      chats={chats}
      messages={messages}
      selectedChatId={selectedChatId}
      isGenerating={isGenerating}
      typingUsers={typingUsers}
      onCreateChat={createChat}
      onSelectChat={selectChat}
      onDeleteChat={deleteChat}
      onSendMessage={sendMessage}
      onEditMessage={editMessage}
      onDeleteMessage={deleteMessage}
      onClearHistory={clearHistory}
      onTyping={notifyTyping}
    />
  );
}
