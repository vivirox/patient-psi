import { useState, useEffect } from 'react';
import type { Chat } from '../../types';

interface ChatListProps {
  patientId: string;
}

export default function ChatList({ patientId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChats();
  }, [patientId]);

  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/chats`);
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = await response.json();
      setChats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading chats...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center">{error}</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {chats.map((chat) => (
          <li key={chat.id}>
            <a
              href={`/patients/${patientId}/chats/${chat.id}`}
              className="block hover:bg-gray-50"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {chat.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Created: {new Date(chat.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {chat.shared && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Shared
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {chats.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No chats found. Start a new conversation!
        </div>
      )}
    </div>
  );
}
