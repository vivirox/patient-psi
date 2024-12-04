import { Button } from '@/components/ui/button'
import { IconCopy, IconCheck } from '@/components/ui/icons'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import { ChatShareDialog } from './ChatShareDialog'

interface ChatMessageActionsProps {
  message: string
  chatId: string
  shareUrl?: string
}

export function ChatMessageActions({
  message,
  chatId,
  shareUrl
}: ChatMessageActionsProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(message)
  }

  return (
    <div className="flex items-center justify-end transition-opacity group-hover:opacity-100 md:absolute md:-right-10 md:-top-2 md:opacity-0">
      <Button variant="ghost" size="icon" onClick={onCopy}>
        {isCopied ? <IconCheck /> : <IconCopy />}
        <span className="sr-only">Copy message</span>
      </Button>
      <ChatShareDialog chatId={chatId} shareUrl={shareUrl} />
    </div>
  )
}
