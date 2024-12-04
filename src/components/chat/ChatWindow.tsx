import { useState, useEffect, useRef } from 'react';
import type { Message } from '../../types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  patientId: string;
  chatId: string;
}

export default function ChatWindow({ patientId, chatId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/chats/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          role: 'user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages([...messages, data]);
      
      // Fetch AI response with streaming
      try {
        const aiResponse = await fetch(`/api/patients/${patientId}/chats/${chatId}/generate`, {
          method: 'POST',
          headers: {
            'Accept': 'text/event-stream',
          },
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            const rateLimitData = await aiResponse.json();
            setError(rateLimitData.message);
            return;
          }
          throw new Error('Failed to generate AI response');
        }

        // Create a temporary message for streaming
        const tempMessage = {
          id: 'temp-' + Date.now(),
          content: '',
          role: 'assistant' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          chatId,
          patientId,
          userId: '',
        };
        setMessages(prev => [...prev, tempMessage]);

        const reader = aiResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Failed to read response stream');
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'token') {
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.id === tempMessage.id) {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, content: lastMessage.content + event.content },
                      ];
                    }
                    return prev;
                  });
                } else if (event.type === 'complete') {
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.id === tempMessage.id) {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, content: event.content },
                      ];
                    }
                    return prev;
                  });
                } else if (event.type === 'error') {
                  setError(event.content);
                  break;
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to generate AI response:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate AI response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-white shadow-lg rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-white shadow-lg rounded-lg">
        <div className="text-red-600 text-center">
          <p className="font-medium">{error}</p>
          <button
            onClick={fetchMessages}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white shadow-lg rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            sender={message.role === 'user' ? 'You' : 'Assistant'}
            timestamp={message.createdAt}
            isUser={message.role === 'user'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
