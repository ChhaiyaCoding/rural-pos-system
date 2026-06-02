import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-primary-600 text-white active:bg-primary-700',
  secondary: 'bg-slate-100 text-slate-800 active:bg-slate-200',
  danger:    'bg-danger-600 text-white active:bg-danger-700',
  ghost:     'bg-transparent text-slate-700 active:bg-slate-100',
}

const SIZE: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? loading}
      className={[
        'inline-flex items-center justify-center rounded-xl font-semibold',
        'transition-colors select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </button>
  )
}
