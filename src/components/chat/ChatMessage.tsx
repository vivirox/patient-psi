import React from 'react';

interface ChatMessageProps {
  content: string;
  sender: string;
  timestamp: string;
  isUser: boolean;
}

export default function ChatMessage({ content, sender, timestamp, isUser }: ChatMessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{sender}</span>
          <span className="text-xs opacity-75">{new Date(timestamp).toLocaleTimeString()}</span>
        </div>
        <p className="mt-1 text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
