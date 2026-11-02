import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${danger ? 'border-bad-line bg-bad-soft text-bad' : 'border-warn-line bg-warn-soft text-warn'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="font-display text-[15px]">{title}</DialogTitle>
            <DialogDescription className="mt-1.5 text-[13px] leading-relaxed">{message}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-2 flex-row justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
