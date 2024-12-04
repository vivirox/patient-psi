import { useEffect, useRef } from 'react';
import { ChatMessage, type Message } from './chat-message';
import { ScrollToBottom } from './scroll-to-bottom';

interface ChatHistoryProps {
  messages: Message[];
  isLoading?: boolean;
  onEditMessage?: (message: Message) => void;
  onDeleteMessage?: (message: Message) => void;
}

export function ChatHistory({
  messages,
  isLoading,
  onEditMessage,
  onDeleteMessage,
}: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!containerRef.current) return;

    const shouldScroll =
      containerRef.current.scrollHeight -
        containerRef.current.scrollTop -
        containerRef.current.clientHeight <
      100;

    if (shouldScroll) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="max-w-md space-y-2">
          <p className="text-lg font-semibold">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Start a conversation by typing a message below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 pb-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLoading={isLoading && index === messages.length - 1}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        ))}
      </div>
      <ScrollToBottom containerRef={containerRef} />
    </div>
  );
}
