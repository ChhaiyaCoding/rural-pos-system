interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center gap-3">
      <div className="mb-1">{icon}</div>
      <p className="font-semibold text-slate-600 text-base">{title}</p>
      {description && (
        <p className="text-sm text-slate-400 max-w-[220px]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
