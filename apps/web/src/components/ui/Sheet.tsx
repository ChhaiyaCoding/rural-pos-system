'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from './cx'
import { IconButton } from './IconButton'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode | undefined
  subtitle?: ReactNode | undefined
  /** Pinned below the scrolling body (e.g. the primary action) */
  footer?: ReactNode | undefined
  /** Extra header buttons, left of the close button */
  headerActions?: ReactNode | undefined
  /** auto: bottom sheet up to 92dvh · full: full screen on phone */
  size?: 'auto' | 'full' | undefined
  /** surface: white panel · bg: app-background panel (e.g. the cart) */
  tone?: 'surface' | 'bg' | undefined
  /** false = scrim tap does nothing (e.g. while saving) */
  dismissible?: boolean | undefined
  hideClose?: boolean | undefined
  /** top: stacks above another open sheet (confirm dialogs) */
  layer?: 'base' | 'top' | undefined
  /** Accessible name when `title` is not plain text */
  ariaLabel?: string | undefined
  panelClassName?: string | undefined
  /** Replaces the default body padding */
  bodyClassName?: string | undefined
  children?: ReactNode
}

/**
 * The one overlay shell. Phone: bottom sheet (28px top radius, grab handle).
 * md+: centered modal (max 580px, 28px radius). Keeps the sheet-up animation.
 */
export function Sheet({
  open, onClose, title, subtitle, footer, headerActions,
  size = 'auto', tone = 'surface', dismissible = true, hideClose = false, layer = 'base',
  ariaLabel, panelClassName, bodyClassName, children,
}: SheetProps) {
  if (!open) return null
  const full = size === 'full'
  const showHeader = title != null || subtitle != null || headerActions != null || !hideClose

  return (
    <div className={cx('fixed inset-0 flex items-end justify-center md:items-center md:p-6', layer === 'top' ? 'z-[60]' : 'z-50')}>
      <div
        className="absolute inset-0 bg-ink-900/50"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel}
        className={cx(
          'relative flex w-full flex-col overflow-hidden shadow-pop animate-sheet-up',
          tone === 'bg' ? 'bg-bg' : 'bg-surface',
          full
            ? 'h-[100dvh] pt-[env(safe-area-inset-top)] md:h-[92dvh] md:max-w-[720px] md:rounded-[28px] md:pt-0'
            : 'max-h-[92dvh] rounded-t-[28px] md:max-w-[580px] md:rounded-[28px]',
          panelClassName,
        )}
      >
        {!full && (
          <div className="flex shrink-0 justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
            <span className="h-[5px] w-10 rounded-full bg-line-strong" />
          </div>
        )}

        {showHeader && (
          <div className={cx('flex shrink-0 items-start gap-3 px-4 pb-3 md:px-6', full ? 'pt-3' : 'pt-1 md:pt-5')}>
            <div className="min-w-0 flex-1 self-center">
              {title != null && <h2 className="text-title-sm font-bold text-text">{title}</h2>}
              {subtitle != null && <p className="text-meta text-text-muted">{subtitle}</p>}
            </div>
            {headerActions}
            {!hideClose && (
              <IconButton aria-label="បិទ" variant={tone === 'bg' ? 'light' : 'soft'} onClick={onClose}>
                <X size={20} strokeWidth={2.25} />
              </IconButton>
            )}
          </div>
        )}

        <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain', bodyClassName ?? 'px-4 pb-4 md:px-6')}>
          {children}
        </div>

        {footer != null && (
          <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
