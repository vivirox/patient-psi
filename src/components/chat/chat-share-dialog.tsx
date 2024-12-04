import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { IconSpinner } from '../ui/icons'
import type { Message } from './chat-message'

interface ShareDialogProps {
  messages: Message[]
  chatId: string
  title: string
  onClose: () => void
  open: boolean
}

export function ChatShareDialog({ messages, chatId, title, onClose, open }: ShareDialogProps) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const formatMessages = () => {
    return messages
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'Assistant' : 'You'
        return `${role}:\n${msg.content}\n`
      })
      .join('\n')
  }

  const handleShareLink = useCallback(async () => {
    try {
      setIsGeneratingLink(true)
      // TODO: Implement share link generation API endpoint
      const response = await fetch('/api/chat/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!response.ok) {
        throw new Error('Failed to generate share link')
      }

      const { sharePath } = await response.json()
      const url = new URL(window.location.href)
      url.pathname = sharePath
      await navigator.clipboard.writeText(url.toString())
      toast.success('Share link copied to clipboard')
    } catch (error) {
      console.error('Failed to generate share link:', error)
      toast.error('Could not generate share link')
    } finally {
      setIsGeneratingLink(false)
    }
  }, [chatId])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const content = formatMessages()
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-export-${new Date().toISOString()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Chat exported successfully')
    } catch (error) {
      console.error('Failed to export messages:', error)
      toast.error('Failed to export chat')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Chat</DialogTitle>
          <DialogDescription>
            Generate a link to share this chat or export its contents.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 space-y-1 text-sm border rounded-md">
            <div className="font-medium">{title}</div>
            <div className="text-muted-foreground">
              {messages.length} messages
            </div>
          </div>

          <div className="flex gap-x-2">
            <Button
              className="flex-1"
              onClick={handleShareLink}
              disabled={isGeneratingLink}
            >
              {isGeneratingLink ? (
                <>
                  <IconSpinner className="mr-2 animate-spin" />
                  Generating link...
                </>
              ) : (
                'Copy share link'
              )}
            </Button>
            
            <Button
              className="flex-1"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <IconSpinner className="mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                'Export as text'
              )}
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded border p-4">
            <pre className="text-sm whitespace-pre-wrap">{formatMessages()}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
