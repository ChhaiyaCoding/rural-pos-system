'use client'

export interface TabCategory {
  id: string
  label: string
}

interface CategoryTabsProps {
  categories: TabCategory[]
  active: string
  onChange: (id: string) => void
  /** Optional per-category product counts shown as a badge */
  counts?: Record<string, number>
}

export function CategoryTabs({ categories, active, onChange, counts }: CategoryTabsProps) {
  return (
    /* Full-bleed horizontal scroll — pills align with the header's px-4 edges */
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-0.5">
      {categories.map((c) => {
        const isActive = c.id === active
        const count = counts?.[c.id]
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={isActive}
            className={[
              'min-h-0 shrink-0 h-10 px-4 rounded-full whitespace-nowrap',
              'text-[13px] font-semibold transition-colors',
              'flex items-center gap-1.5',
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 active:bg-slate-50',
            ].join(' ')}
          >
            {c.label}
            {typeof count === 'number' && (
              <span
                className={[
                  'tabular-nums text-[11px] font-bold rounded-full px-1.5 min-w-[18px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
