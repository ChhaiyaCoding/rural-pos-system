type Variant = 'default' | 'success' | 'danger' | 'warning'

interface BadgeProps {
  label: string
  variant?: Variant
}

const VARIANT: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-success-50 text-success-600',
  danger:  'bg-danger-50 text-danger-600',
  warning: 'bg-warning-50 text-warning-500',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        VARIANT[variant],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
