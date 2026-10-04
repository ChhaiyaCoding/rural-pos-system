import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label shown inside the field, above the value */
  label?: string | undefined
  error?: string | undefined
  hint?: string | undefined
  /** Trailing slot inside the field (unit, icon button…) */
  trailing?: ReactNode | undefined
  /** Fill color: bg (on white sheets/cards, default) or surface (on the app background) */
  fill?: 'bg' | 'surface' | undefined
}

/** Filled field: label inside, radius 18, 54px+ tall. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, trailing, fill = 'bg', className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
    return (
      <div className="w-full">
        <div
          className={cx(
            'flex min-h-[54px] items-center gap-2 rounded-[18px] px-4 transition-shadow',
            'focus-within:ring-2',
            error
              ? 'bg-danger-bg focus-within:ring-danger/40'
              : cx(fill === 'surface' ? 'bg-surface' : 'bg-bg', 'focus-within:ring-ink-900/20'),
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col py-1.5">
            {label && (
              <label htmlFor={inputId} className="text-caption font-semibold text-text-subtle">
                {label}
              </label>
            )}
            <input
              ref={ref}
              id={inputId}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              {...props}
              className={cx(
                'w-full min-w-0 bg-transparent text-body font-semibold text-text outline-none',
                'placeholder:font-normal placeholder:text-text-muted',
                className,
              )}
            />
          </div>
          {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
        {error && <p id={`${inputId}-error`} className="mt-1 px-1 text-meta text-danger">{error}</p>}
        {!error && hint && <p id={`${inputId}-hint`} className="mt-1 px-1 text-meta text-text-muted">{hint}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
