import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'onDark' | 'dangerSoft' | 'dashed'
export type ButtonSize = 'md' | 'lg' | 'xl'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined
  /** md 48px · lg 56px · xl 62px (primary CTA) */
  size?: ButtonSize | undefined
  /** Leading icon (lucide element) */
  icon?: ReactNode | undefined
  /** Trailing icon */
  iconEnd?: ReactNode | undefined
  fullWidth?: boolean | undefined
}

const VARIANT: Record<ButtonVariant, string> = {
  // Text on accent is always ink, never white.
  primary:    'bg-accent text-ink-900 active:brightness-95 focus-visible:outline-ink-900',
  dark:       'bg-ink-900 text-white active:bg-ink-800 focus-visible:outline-accent',
  secondary:  'bg-surface text-ink-900 border border-line active:bg-surface-2 focus-visible:outline-ink-900',
  onDark:     'bg-ink-800 text-white active:bg-ink-700 focus-visible:outline-accent',
  dangerSoft: 'bg-danger-bg text-danger active:brightness-95 focus-visible:outline-danger',
  dashed:     'bg-transparent text-text-subtle border-2 border-dashed border-line-strong active:bg-surface-2 focus-visible:outline-ink-900',
}

const SIZE: Record<ButtonSize, string> = {
  md: 'h-12 px-4 text-body',
  lg: 'h-14 px-5 text-label-lg',
  xl: 'h-[62px] px-6 text-label-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconEnd, fullWidth = false, className, type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-bold select-none',
        'transition-[background-color,filter] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {icon && <span className="shrink-0 inline-flex" aria-hidden="true">{icon}</span>}
      {children}
      {iconEnd && <span className="shrink-0 inline-flex" aria-hidden="true">{iconEnd}</span>}
    </button>
  )
})
