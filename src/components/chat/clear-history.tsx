import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog'
import { IconSpinner, IconTrash } from '../ui/icons'

interface ServerActionResult<T> {
  data?: T
  error?: string
}

interface ClearHistoryProps {
  isEnabled?: boolean
  messageCount: number
  clearChats: () => Promise<ServerActionResult<void>>
}

export function ClearHistory({
  isEnabled = true,
  messageCount,
  clearChats
}: ClearHistoryProps) {
  const [open, setOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleClear = async () => {
    try {
      setIsClearing(true)
      const result = await clearChats()
      
      if (result && 'error' in result) {
        toast.error(result.error)
        return
      }

      toast.success('Chat history cleared successfully')
      setOpen(false)
    } catch (error) {
      toast.error('Failed to clear chat history')
      console.error('Error clearing chat history:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const isDisabled = !isEnabled || messageCount === 0 || isClearing

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {messageCount} message{messageCount !== 1 ? 's' : ''}
        </div>
        
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            className="flex items-center gap-2"
          >
            {isClearing ? (
              <IconSpinner className="h-4 w-4 animate-spin" />
            ) : (
              <IconTrash className="h-4 w-4" />
            )}
            Clear History
          </Button>
        </AlertDialogTrigger>
      </div>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your chat history and remove your data
            from our servers. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={isClearing}
            className="bg-red-500 hover:bg-red-600"
          >
            {isClearing ? (
              <>
                <IconSpinner className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
