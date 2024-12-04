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
import { IconPlay } from '@/components/ui/icons'

interface StartSessionProps {
  onStart: () => void
  isDisabled?: boolean
}

export function StartSession({ onStart, isDisabled = false }: StartSessionProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleStart = () => {
    setIsOpen(false)
    onStart()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 space-x-2"
          disabled={isDisabled}
        >
          <IconPlay className="h-4 w-4" />
          <span>Start Session</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Session</DialogTitle>
          <DialogDescription>
            Are you ready to begin a new therapy session? This will start the timer
            and begin recording your conversation.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart}>Start Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
