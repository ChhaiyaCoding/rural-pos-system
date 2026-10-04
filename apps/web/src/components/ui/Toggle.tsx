'use client'

import { cx } from './cx'

export interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Accessible name (Khmer) */
  label: string
  disabled?: boolean | undefined
  className?: string | undefined
}

/** 52×32 switch drawn inside a 48px-tall tap target. On = ink-900 track. */
export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'inline-flex h-12 w-[60px] shrink-0 items-center justify-center rounded-md',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink-900',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'relative h-8 w-[52px] rounded-full transition-colors duration-150',
          checked ? 'bg-ink-900' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-xs transition-transform duration-150',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
