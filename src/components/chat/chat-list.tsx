import { useState } from 'react'
import { Button } from '../ui/button'
import { IconPlus, IconSpinner, IconX } from '../ui/icons'
import { formatDate, cn } from '../../lib/utils'

interface Chat {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

interface ChatListProps extends React.ComponentProps<'div'> {
  chats: Chat[]
  selectedChatId?: string
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => Promise<void>
  onCreateChat: () => void
  className?: string
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  onDeleteChat,
  onCreateChat,
  className,
  ...props
}: ChatListProps) {
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingChatId) return

    try {
      setDeletingChatId(chatId)
      await onDeleteChat(chatId)
    } finally {
      setDeletingChatId(null)
    }
  }

  return (
    <div 
      className={cn('flex h-full flex-col gap-4 p-4', className)}
      {...props}
    >
      <Button
        onClick={onCreateChat}
        className="w-full justify-start gap-2"
        variant="outline"
      >
        <IconPlus className="h-5 w-5" />
        <span>New Chat</span>
      </Button>

      <div className="flex-1 gap-2 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-xs gap-2">
              <p className="text-sm text-muted-foreground">No chats yet</p>
              <p className="text-xs text-muted-foreground">
                Click the button above to start a new chat
              </p>
            </div>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                'group relative w-full rounded-lg border p-3 text-left',
                'transition-colors duration-200',
                'hover:bg-accent/50',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                selectedChatId === chat.id
                  ? 'border-primary bg-accent'
                  : 'border-transparent'
              )}
            >
              <div className="gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="line-clamp-1 font-medium">{chat.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6 p-0',
                      'opacity-0 transition-opacity duration-200',
                      'group-hover:opacity-100',
                      'focus:opacity-100'
                    )}
                    onClick={(e) => handleDelete(chat.id, e)}
                    disabled={!!deletingChatId}
                    aria-label="Delete chat"
                  >
                    {deletingChatId === chat.id ? (
                      <IconSpinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconX className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(chat.updatedAt)}</span>
                  <span>•</span>
                  <span>{chat.messageCount} messages</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
