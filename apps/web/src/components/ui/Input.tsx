import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        className={[
          'w-full h-12 px-4 rounded-xl border text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'placeholder:text-slate-400',
          error
            ? 'border-danger-500 bg-danger-50'
            : 'border-slate-300 bg-white',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
)

Input.displayName = 'Input'
