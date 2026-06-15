import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'success' | 'danger' | 'secondary' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-primary-600 text-white active:bg-primary-700',
  success:   'bg-success-600 text-white active:bg-success-700',
  danger:    'bg-danger-600 text-white active:bg-danger-700',
  secondary: 'bg-slate-100 text-slate-700 active:bg-slate-200',
  ghost:     'bg-transparent text-slate-700 active:bg-slate-100',
}

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-[14px]',
  lg: 'h-13 px-5 text-[15px]',   // standard full-width primary CTA
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold',
        'transition-colors select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
