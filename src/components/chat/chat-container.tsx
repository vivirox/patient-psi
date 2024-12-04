import { useState, useEffect, useRef } from 'react';
import type { Message } from './chat-message';
import { ChatHistory } from './chat-history';
import { ChatPromptForm } from './chat-prompt-form';
import { ChatList } from './chat-list';
import { ClearHistory } from './clear-history';
import { ChatShareDialog } from './chat-share-dialog';
import { Button } from '../ui/button';

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface ChatContainerProps {
  chats: Chat[];
  messages: Message[];
  selectedChatId?: string;
  isGenerating: boolean;
  typingUsers: Set<string>;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  onSendMessage: (content: string) => Promise<void>;
  onEditMessage: (message: Message) => Promise<void>;
  onDeleteMessage: (message: Message) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onTyping: () => void;
}

export function ChatContainer({
  chats,
  messages,
  selectedChatId,
  isGenerating,
  typingUsers,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onClearHistory,
  onTyping,
}: ChatContainerProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          onCreateChat={onCreateChat}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
              <span className="sr-only">Toggle menu</span>
            </Button>

            <h2 className="text-lg font-semibold">
              {selectedChatId ? 'Chat' : 'Select or create a chat'}
            </h2>
          </div>

          {selectedChatId && messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mr-2 h-4 w-4"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </Button>
          )}
        </div>

        {/* Chat content */}
        <div className="relative flex-1 overflow-hidden">
          {selectedChatId ? (
            <>
              <div
                ref={historyRef}
                className="flex-1 overflow-y-auto p-4"
              >
                <ChatHistory
                  messages={messages}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                />
                {/* Typing Indicator */}
                {typingUsers.size > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="flex space-x-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce delay-100">.</span>
                      <span className="animate-bounce delay-200">.</span>
                    </div>
                    <span>
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                <ChatPromptForm
                  onSubmit={onSendMessage}
                  onTyping={onTyping}
                  isGenerating={isGenerating}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md space-y-4 text-center">
                <h3 className="text-lg font-semibold">Welcome to Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Select an existing chat from the sidebar or create a new one to
                  get started.
                </p>
                <Button onClick={onCreateChat}>Start New Chat</Button>
              </div>
            </div>
          )}
        </div>

        {/* Clear history */}
        {selectedChatId && (
          <ClearHistory
            onClear={onClearHistory}
            messageCount={messages.length}
          />
        )}
      </div>

      {/* Share dialog */}
      {isShareDialogOpen && (
        <ChatShareDialog
          messages={messages}
          onClose={() => setIsShareDialogOpen(false)}
        />
      )}
    </div>
  );
}
