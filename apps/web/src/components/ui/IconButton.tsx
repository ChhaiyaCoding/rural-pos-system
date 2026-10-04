import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'
import { Pill } from './Pill'

/** light = white (on bg) · soft = surface-2 (on white) · onDark = ink-800 (on ink) */
export type IconButtonVariant = 'light' | 'soft' | 'onDark'

const VARIANT: Record<IconButtonVariant, string> = {
  light:  'bg-surface text-ink-900 active:bg-surface-2 focus-visible:outline-ink-900',
  soft:   'bg-surface-2 text-ink-900 active:bg-line focus-visible:outline-ink-900',
  onDark: 'bg-ink-800 text-white active:bg-ink-700 focus-visible:outline-accent',
}

/** Shared classes so a next/link can look exactly like an IconButton. */
export function iconButtonClass(variant: IconButtonVariant = 'light', className?: string | undefined): string {
  return cx(
    'relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md',
    'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    VARIANT[variant],
    className,
  )
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required — icon-only buttons must be named (Khmer). */
  'aria-label': string
  variant?: IconButtonVariant | undefined
  /** Optional count badge in the top-right corner */
  badge?: number | undefined
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'light', badge, className, type = 'button', children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} {...props} className={iconButtonClass(variant, className)}>
      <span className="inline-flex" aria-hidden="true">{children}</span>
      {badge != null && badge > 0 && (
        <Pill variant="count" className="absolute -top-1 -right-1" aria-hidden="true">
          {badge > 9 ? '9+' : badge}
        </Pill>
      )}
    </button>
  )
})
