import type { ReactNode } from 'react'
import { cx } from './cx'

interface EmptyStateProps {
  /** A lucide icon element, e.g. <Users size={30} strokeWidth={1.5} /> — rendered
   *  inside the standard tile (color is inherited, no need to set it). */
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
      className={cx(
        'flex flex-col items-center justify-center gap-3 px-6 text-center',
        fullHeight ? 'flex-1' : 'py-16',
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface text-nav-off" aria-hidden="true">
        {icon}
      </div>
      <p className="text-body font-semibold text-text">{title}</p>
      {description && (
        <p className="max-w-[260px] text-meta text-text-muted">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
