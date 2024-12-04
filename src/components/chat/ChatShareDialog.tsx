import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { IconShare } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'

interface ShareDialogProps {
  chatId: string
  shareUrl?: string
}

export function ChatShareDialog({ chatId, shareUrl }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedShareUrl, setGeneratedShareUrl] = useState(shareUrl)

  const generateShareUrl = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/chat/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chatId })
      })
      
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate share URL')
      }
      
      setGeneratedShareUrl(data.shareUrl)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate share URL. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!generatedShareUrl) return
    try {
      await navigator.clipboard.writeText(generatedShareUrl)
      toast({
        title: 'Copied to clipboard',
        description: 'Share URL has been copied to your clipboard.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy URL to clipboard.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <IconShare />
          <span className="sr-only">Share chat</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Chat</DialogTitle>
          <DialogDescription>
            Anyone with the share link will be able to view this chat.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!generatedShareUrl ? (
            <Button
              variant="outline"
              onClick={generateShareUrl}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Share Link'}
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Input
                value={generatedShareUrl}
                readOnly
                className="flex-1"
              />
              <Button onClick={copyToClipboard}>
                Copy
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
