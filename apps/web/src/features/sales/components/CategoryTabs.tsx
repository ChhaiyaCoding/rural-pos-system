'use client'

import { useEffect, useRef, useState } from 'react'
import { cx } from '@/components/ui/cx'

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
  className?: string | undefined
}

/** Horizontal pill row (phone, iPad portrait); a vertical list at lg+
 *  (rendered inside the POS category column). */
export function CategoryTabs({ categories, active, onChange, counts, className }: CategoryTabsProps) {
  /* Right-edge fade while more pills are hidden (horizontal row only) */
  const rowRef = useRef<HTMLDivElement>(null)
  const [moreRight, setMoreRight] = useState(false)
  const updateFade = () => {
    const el = rowRef.current
    if (el) setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  // Re-measure after every render: pill widths change when counts load.
  useEffect(updateFade)
  useEffect(() => {
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [])

  return (
    <div
      ref={rowRef}
      onScroll={updateFade}
      className={cx(
        'flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar',
        'lg:flex-col lg:gap-1.5 lg:overflow-visible',
        className,
      )}
    >
      {categories.map((c) => {
        const isActive = c.id === active
        const count = counts?.[c.id]
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={isActive}
            className={cx(
              'flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4',
              'text-body-sm font-semibold transition-colors',
              'lg:h-[54px] lg:w-full lg:justify-between lg:rounded-md',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
              isActive
                ? 'bg-ink-900 text-white'
                : 'bg-surface text-text-subtle active:bg-surface-2 lg:active:bg-bg',
            )}
          >
            <span className="truncate">{c.label}</span>
            {typeof count === 'number' && (
              <span className="text-caption font-bold tabular-nums opacity-70">{count}</span>
            )}
          </button>
        )
      })}

      {/* End spacer: iOS Safari ignores padding-right in a scrolling flex row,
          so this keeps the last pill fully revealable. */}
      <span className="w-2 shrink-0 lg:hidden" aria-hidden="true" />

      {/* Fade pinned to the right edge while the row can scroll further */}
      <span
        className={cx(
          'pointer-events-none sticky right-0 -ml-2 w-0 shrink-0 self-stretch transition-opacity lg:hidden',
          moreRight ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg to-transparent" />
      </span>
    </div>
  )
}
