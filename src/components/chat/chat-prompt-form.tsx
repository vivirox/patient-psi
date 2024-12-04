import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { IconSpinner, IconSend } from '../ui/icons'
import { useAutoResizeTextarea } from '../../hooks/use-auto-resize-textarea'
import { cn } from '../../lib/utils'

interface ChatPromptFormProps extends React.ComponentProps<'form'> {
  onSubmit: (content: string) => void
  onTyping?: () => void
  isGenerating?: boolean
  initialContent?: string
  placeholder?: string
  maxRows?: number
  className?: string
}

export function ChatPromptForm({
  onSubmit,
  onTyping,
  isGenerating = false,
  initialContent = '',
  placeholder = 'Type your message...',
  maxRows = 5,
  className,
  ...props
}: ChatPromptFormProps) {
  const [content, setContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastTypingTime = useRef<number>(0)

  // Auto-resize textarea as content grows
  useAutoResizeTextarea(textareaRef.current, content)

  // Handle typing notifications with debounce
  useEffect(() => {
    if (!onTyping) return

    const now = Date.now()
    if (content && now - lastTypingTime.current > 1000) {
      onTyping()
      lastTypingTime.current = now
    }
  }, [content, onTyping])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmedContent = content.trim()
      if (!trimmedContent || isGenerating) return

      onSubmit(trimmedContent)
      setContent('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    },
    [content, isGenerating, onSubmit]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === 'Enter' && 
        !e.shiftKey && 
        !e.nativeEvent.isComposing
      ) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn('relative', className)}
      {...props}
    >
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isGenerating}
        className={cn(
          'resize-none pr-20',
          'min-h-[3rem]',
          'scrollbar-thumb-rounded scrollbar-track-rounded',
          'scrollbar-thumb-primary/10 scrollbar-track-primary/5',
          'hover:scrollbar-thumb-primary/20 focus:scrollbar-thumb-primary/20',
          isGenerating && 'opacity-50'
        )}
        rows={1}
        maxRows={maxRows}
      />
      <div className="absolute right-2 bottom-2">
        <Button
          type="submit"
          disabled={!content.trim() || isGenerating}
          size="icon"
          className={cn(
            'h-8 w-8',
            'transition-opacity duration-200',
            (!content.trim() || isGenerating) && 'opacity-50'
          )}
        >
          {isGenerating ? (
            <IconSpinner className="h-4 w-4 animate-spin" />
          ) : (
            <IconSend className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isGenerating ? 'Generating...' : 'Send message'}
          </span>
        </Button>
      </div>
    </form>
  )
}
