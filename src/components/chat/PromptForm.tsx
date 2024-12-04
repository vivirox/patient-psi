import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { IconArrowElbow } from '@/components/ui/icons'

interface PromptFormProps {
  onSubmit: (value: string) => Promise<void>
  isLoading?: boolean
}

export function PromptForm({ onSubmit, isLoading }: PromptFormProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input?.trim()) {
      return
    }
    setInput('')
    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-background px-8 sm:rounded-md sm:border sm:px-12">
      <Textarea
        ref={inputRef}
        tabIndex={0}
        rows={1}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Send a message..."
        spellCheck={false}
        className="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      <div className="absolute right-0 top-4 sm:right-4">
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || input === ''}
        >
          <IconArrowElbow />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  )
}
