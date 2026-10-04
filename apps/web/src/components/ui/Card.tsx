import type { HTMLAttributes } from 'react'
import { cx } from './cx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** default = white surface · muted = surface-2 (nested blocks) */
  tone?: 'default' | 'muted' | undefined
  padding?: 'none' | 'sm' | 'md' | undefined
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4' } as const

/** White card on the app background. v2 cards use no shadow. */
export function Card({ tone = 'default', padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-lg',
        tone === 'muted' ? 'bg-surface-2' : 'bg-surface',
        PADDING[padding],
        className,
      )}
    />
  )
}
