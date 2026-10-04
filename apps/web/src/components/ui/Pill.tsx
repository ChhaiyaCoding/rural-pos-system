import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export type PillVariant =
  | 'success' | 'debt' | 'warn' | 'danger' | 'neutral' | 'accent' | 'count'
  | 'warnSolid' | 'dangerSolid'

const VARIANT: Record<PillVariant, string> = {
  success:     'bg-success-bg text-success',
  debt:        'bg-debt-bg text-debt',
  warn:        'bg-warn-bg text-warn',
  danger:      'bg-danger-bg text-danger',
  neutral:     'bg-bg text-text-subtle',
  accent:      'bg-accent text-ink-900',
  count:       'bg-badge text-white',
  warnSolid:   'bg-warn text-white',
  dangerSolid: 'bg-danger text-white',
}

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant | undefined
  icon?: ReactNode | undefined
  children?: ReactNode
}

/** Status pill / count badge. 12px is the smallest text size in the app. */
export function Pill({ variant = 'neutral', icon, className, children, ...props }: PillProps) {
  const isCount = variant === 'count'
  return (
    <span
      {...props}
      className={cx(
        'inline-flex items-center justify-center rounded-full font-bold tabular-nums whitespace-nowrap',
        isCount
          ? 'min-w-[18px] h-[18px] px-1 text-caption leading-none'
          : 'h-7 gap-1 px-2.5 text-caption',
        VARIANT[variant],
        className,
      )}
    >
      {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}
