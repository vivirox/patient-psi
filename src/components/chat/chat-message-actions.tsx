import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { IconCheck, IconCopy, IconEdit, IconSpinner, IconTrash } from '../ui/icons'
import { useCopyToClipboard } from '../../lib/hooks/use-copy-to-clipboard'
import type { Message } from './chat-message'

interface ChatMessageActionsProps extends React.ComponentProps<'div'> {
  message: Message
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
}

export function ChatMessageActions({
  message,
  onEdit,
  onDelete,
  className,
  ...props
}: ChatMessageActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(message.content)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    try {
      setIsDeleting(true)
      await onDelete(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-end transition-opacity group-hover:opacity-100 md:absolute md:-right-10 md:-top-2 md:opacity-0',
        className
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onCopy}
      >
        {isCopied ? <IconCheck /> : <IconCopy />}
        <span className="sr-only">Copy message</span>
      </Button>

      {onEdit && message.role === 'user' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(message)}
        >
          <IconEdit />
          <span className="sr-only">Edit message</span>
        </Button>
      )}

      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? <IconSpinner className="animate-spin" /> : <IconTrash />}
          <span className="sr-only">Delete message</span>
        </Button>
      )}
    </div>
  )
}
