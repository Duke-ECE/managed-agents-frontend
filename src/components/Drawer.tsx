import type { ReactNode } from 'react'
import { cn } from '../utils/format'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: string
  footer?: ReactNode
}

export default function Drawer({ open, onClose, title, children, width = 'max-w-lg', footer }: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <SheetContent className={cn('w-full', width)}>
        <div className="flex h-16 shrink-0 items-center border-b border-ink-800 px-6 pr-14">
          <SheetTitle className="font-display text-[15px]">{title}</SheetTitle>
          <SheetDescription className="sr-only">Agent details and settings</SheetDescription>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink-800 px-6 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}
