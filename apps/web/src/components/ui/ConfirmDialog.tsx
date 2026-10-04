'use client'

import type { ReactNode } from 'react'
import { cx } from './cx'
import { Button } from './Button'
import { Sheet } from './Sheet'

export type ConfirmTone = 'danger' | 'success' | 'accent'

const ICON_TILE: Record<ConfirmTone, string> = {
  danger:  'bg-danger-bg text-danger',
  success: 'bg-success-bg text-success',
  accent:  'bg-accent text-ink-900',
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: ReactNode | undefined
  icon?: ReactNode | undefined
  tone?: ConfirmTone | undefined
  confirmLabel: string
  cancelLabel?: string | undefined
  /** Shown on the confirm button while busy */
  busyLabel?: string | undefined
  busy?: boolean | undefined
  onConfirm: () => void
  onCancel: () => void
}

/** Yes/no confirmation built on Sheet; stacks above an open sheet. */
export function ConfirmDialog({
  open, title, message, icon, tone = 'accent', confirmLabel, cancelLabel = 'បោះបង់',
  busyLabel, busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      layer="top"
      hideClose
      dismissible={!busy}
      ariaLabel={title}
      panelClassName="md:max-w-sm"
      bodyClassName="px-5 pt-3 pb-2 md:px-6 md:pt-6"
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'dangerSoft' : 'primary'} size="lg" onClick={onConfirm} disabled={busy}>
            {busy && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        {icon && (
          <span className={cx('mb-3 flex h-14 w-14 items-center justify-center rounded-full', ICON_TILE[tone])} aria-hidden="true">
            {icon}
          </span>
        )}
        <p className="text-title-sm font-bold text-text">{title}</p>
        {message && <div className="mt-1.5 text-body-sm text-text-subtle">{message}</div>}
      </div>
    </Sheet>
  )
}
