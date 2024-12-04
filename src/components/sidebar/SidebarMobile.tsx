import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { IconSidebar } from '@/components/ui/icons'

interface SidebarMobileProps {
  children?: React.ReactNode
}

export function SidebarMobile({ children }: SidebarMobileProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <IconSidebar className="h-6 w-6" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-muted/50 p-0">
        <SheetHeader className="p-4">
          <SheetTitle>Chat History</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
