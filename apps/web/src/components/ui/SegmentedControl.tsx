'use client'

import type { ReactNode } from 'react'
import { cx } from './cx'

export interface SegmentedItem<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode | undefined
}

export interface SegmentedControlProps<T extends string> {
  items: readonly SegmentedItem<T>[]
  value: T
  onChange: (value: T) => void
  /** light: track on light surfaces · dark: track inside an ink hero */
  tone?: 'light' | 'dark' | undefined
  /** Accessible name for the group (Khmer) */
  ariaLabel: string
  className?: string | undefined
}

export function SegmentedControl<T extends string>({
  items, value, onChange, tone = 'light', ariaLabel, className,
}: SegmentedControlProps<T>) {
  const dark = tone === 'dark'
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx('flex gap-1 rounded-md p-1', dark ? 'bg-ink-800' : 'bg-track', className)}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cx(
              'flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm px-3 h-12',
              'text-body-sm font-semibold whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1',
              dark
                ? active ? 'bg-accent text-ink-900 focus-visible:outline-white' : 'text-ink-300 active:bg-ink-700 focus-visible:outline-accent'
                : active ? 'bg-surface text-ink-900 shadow-xs focus-visible:outline-ink-900' : 'text-text-subtle active:bg-surface/60 focus-visible:outline-ink-900',
            )}
          >
            {item.icon && <span className="inline-flex shrink-0" aria-hidden="true">{item.icon}</span>}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
