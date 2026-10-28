'use client'

import { Minus, Plus } from 'lucide-react'
import { cx } from './cx'

/** accent: product card · neutral: cart row · onDark: iPad dark cart */
export type StepperVariant = 'accent' | 'neutral' | 'onDark'

const TRACK: Record<StepperVariant, string> = {
  accent:  'bg-accent',
  neutral: 'bg-bg',
  onDark:  'bg-ink-800',
}
const MINUS: Record<StepperVariant, string> = {
  accent:  'bg-ink-900/10 text-ink-900',
  neutral: 'bg-surface text-ink-900',
  onDark:  'bg-ink-700 text-white',
}
const PLUS: Record<StepperVariant, string> = {
  accent:  'bg-ink-900 text-white',
  neutral: 'bg-ink-900 text-white',
  onDark:  'bg-accent text-ink-900',
}

export interface StepperProps {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  variant?: StepperVariant | undefined
  decrementLabel?: string | undefined
  incrementLabel?: string | undefined
  disableDecrement?: boolean | undefined
  disableIncrement?: boolean | undefined
  fullWidth?: boolean | undefined
  className?: string | undefined
}

/** − qty +. Each button is a 48px tap target with a 42px visual inside. */
export function Stepper({
  value, onDecrement, onIncrement, variant = 'neutral',
  decrementLabel = 'បន្ថយ', incrementLabel = 'បន្ថែម',
  disableDecrement, disableIncrement, fullWidth, className,
}: StepperProps) {
  const btn = cx(
    'group inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]',
    'focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
    variant === 'onDark' ? 'focus-visible:outline-accent' : 'focus-visible:outline-ink-900',
    'disabled:opacity-40 disabled:pointer-events-none',
  )
  const face = 'inline-flex h-[42px] w-[42px] items-center justify-center rounded-sm transition-transform group-active:scale-95'
  return (
    <div
      role="group"
      aria-label="ចំនួន"
      className={cx('inline-flex items-center justify-between rounded-[15px]', TRACK[variant], fullWidth && 'w-full', className)}
    >
      <button type="button" aria-label={decrementLabel} onClick={onDecrement} disabled={disableDecrement} className={btn}>
        <span className={cx(face, MINUS[variant])} aria-hidden="true"><Minus size={18} strokeWidth={2.5} /></span>
      </button>
      <span
        aria-live="polite"
        className={cx(
          'min-w-[2.5ch] px-1 text-center text-body font-bold tabular-nums',
          variant === 'onDark' ? 'text-white' : 'text-ink-900',
        )}
      >
        {value}
      </span>
      <button type="button" aria-label={incrementLabel} onClick={onIncrement} disabled={disableIncrement} className={btn}>
        <span className={cx(face, PLUS[variant])} aria-hidden="true"><Plus size={18} strokeWidth={2.5} /></span>
      </button>
    </div>
  )
}
