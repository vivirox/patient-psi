import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { IconArrowDown } from '../ui/icons'
import { cn } from '../../lib/utils'

interface ScrollToBottomProps extends React.ComponentProps<'div'> {
  containerRef: React.RefObject<HTMLDivElement>
  showAlways?: boolean
  className?: string
}

export function ScrollToBottom({ 
  containerRef,
  showAlways = false,
  className,
  ...props
}: ScrollToBottomProps) {
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowButton(showAlways || !isNearBottom)
    }

    // Initial check
    handleScroll()

    container.addEventListener('scroll', handleScroll)
    // Also check on content changes
    const observer = new MutationObserver(handleScroll)
    observer.observe(container, { childList: true, subtree: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [containerRef, showAlways])

  const scrollToBottom = () => {
    const container = containerRef.current
    if (!container) return

    const scrollHeight = container.scrollHeight
    container.scrollTo({
      top: scrollHeight,
      behavior: 'smooth'
    })
  }

  if (!showButton) return null

  return (
    <div
      className={cn(
        'absolute bottom-0 right-4 z-10',
        'transition-opacity duration-300',
        showButton ? 'opacity-100' : 'opacity-0',
        className
      )}
      {...props}
    >
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full bg-background/95 shadow-md"
        onClick={scrollToBottom}
      >
        <IconArrowDown className="h-4 w-4" />
        <span className="sr-only">Scroll to bottom</span>
      </Button>
    </div>
  )
}
