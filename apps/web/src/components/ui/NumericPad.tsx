'use client'

import { Delete } from 'lucide-react'
import { cx } from './cx'

interface NumericPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number | undefined
  /** light: white keys on bg · dark: ink-800 keys on ink-900 */
  tone?: 'light' | 'dark' | undefined
  className?: string | undefined
}

const BACKSPACE = '⌫'
const KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '000', '0', BACKSPACE,
]

export function NumericPad({ value, onChange, maxLength = 10, tone = 'light', className }: NumericPadProps) {
  const handleKey = (key: string) => {
    if (key === BACKSPACE) {
      onChange(value.slice(0, -1))
      return
    }
    if (value.length >= maxLength) return
    onChange(value + key)
  }

  const dark = tone === 'dark'
  return (
    <div className={cx('grid grid-cols-3 gap-2.5', className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          aria-label={key === BACKSPACE ? 'លុប' : undefined}
          className={cx(
            'flex h-[60px] items-center justify-center rounded-[18px] select-none tabular-nums',
            'text-amount font-semibold transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            dark
              ? 'bg-ink-800 text-white active:bg-ink-700 focus-visible:outline-accent'
              : 'bg-surface text-ink-900 active:bg-surface-2 focus-visible:outline-ink-900',
          )}
        >
          {key === BACKSPACE ? <Delete size={26} strokeWidth={2} aria-hidden="true" /> : key}
        </button>
      ))}
    </div>
  )
}
