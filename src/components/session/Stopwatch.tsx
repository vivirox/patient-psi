import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip'
import { useLocation } from 'astro/virtual-modules/location'

interface StopwatchProps {
  isRunning?: boolean
  onTimeUpdate?: (time: number) => void
  className?: string
}

export function Stopwatch({ 
  isRunning: controlledIsRunning, 
  onTimeUpdate,
  className = '' 
}: StopwatchProps) {
  const [internalIsRunning, setInternalIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const location = useLocation()
  
  // Allow both controlled and uncontrolled usage
  const isRunning = controlledIsRunning ?? internalIsRunning

  useEffect(() => {
    // Auto-start/stop based on route
    if (location.pathname === '/' && isRunning) {
      setInternalIsRunning(false)
      setTime(0)
    } else if (location.pathname.startsWith('/chat/') && !isRunning) {
      setInternalIsRunning(true)
    }
  }, [location.pathname, isRunning])

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime + 1
          onTimeUpdate?.(newTime)
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isRunning, onTimeUpdate])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`size-12 rounded-full bg-background p-0 ${className}`}
        >
          <span className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            {formatTime(time)}
          </span>
          <span className="sr-only">Session Timer</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Session Timer</TooltipContent>
    </Tooltip>
  )
}
