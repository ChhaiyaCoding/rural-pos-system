import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** A lucide icon element, e.g. <Users size={30} strokeWidth={1.5} /> — rendered
   *  inside the standard tinted tile (color is inherited, no need to set it). */
  icon: ReactNode
  title: string
  description?: string | undefined
  action?: ReactNode | undefined
  /** Fill the available height (flex-1) instead of the default fixed padding.
   *  Use for whole-page empties; omit for in-body empties below other content. */
  fullHeight?: boolean | undefined
}

export function EmptyState({ icon, title, description, action, fullHeight = false }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 text-center px-6',
        fullHeight ? 'flex-1' : 'py-16',
      ].join(' ')}
    >
      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-300">
        {icon}
      </div>
      <p className="text-[14px] font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="text-[12px] text-slate-400 max-w-[240px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
