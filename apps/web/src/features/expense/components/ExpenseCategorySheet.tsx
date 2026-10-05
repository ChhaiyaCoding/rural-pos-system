'use client'

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { formatDateOnlyKm, todayISODate, addDaysISODate } from '@/lib/date'
import { expenseCategoryLabel, expenseCategoryEmoji } from '@/services/expense.service'
import { Sheet } from '@/components/ui/Sheet'
import { cx } from '@/components/ui/cx'
import { expenseCategoryUi } from '../categoryUi'
import type { Expense } from '@/types'
import type { KHR, TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  categoryId: string
  /** Inclusive date range 'YYYY-MM-DD' — same filter as the Expenses page */
  from: string
  to: string
  onClose: () => void
}

function dateLabel(iso: string): string {
  const today = todayISODate()
  if (iso === today) return 'ថ្ងៃនេះ'
  if (iso === addDaysISODate(today, -1)) return 'ម្សិលមិញ'
  return formatDateOnlyKm(iso)
}

/** Category detail — totals + that category's expense history for the period. */
export function ExpenseCategorySheet({ categoryId, from, to, onClose }: Props) {
  const expenses = useLiveQuery(
    () => db.expenses
      .where('tenantId').equals(DEMO_TENANT)
      .filter((e) => !e.deletedAt && e.categoryId === categoryId && e.spentAt >= from && e.spentAt <= to)
      .toArray(),
    [categoryId, from, to],
  ) ?? []

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.spentAt.localeCompare(a.spentAt) || b.createdAt.localeCompare(a.createdAt)),
    [expenses],
  )
  const total = expenses.reduce((s, e) => s + (e.amount as number), 0) as KHR

  return (
    <Sheet
      open
      onClose={onClose}
      ariaLabel={expenseCategoryLabel(categoryId)}
      title={
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-title', expenseCategoryUi(categoryId).tile)}
            aria-hidden="true"
          >
            {expenseCategoryEmoji(categoryId)}
          </span>
          <span className="truncate">{expenseCategoryLabel(categoryId)}</span>
        </span>
      }
    >
      {/* Summary */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-debt-bg px-4 py-3.5 text-debt">
        <div>
          <p className="text-meta font-bold">ចំណាយ​សរុប</p>
          <p className="mt-0.5 text-meta">{expenses.length} ដង</p>
        </div>
        <div className="text-right tabular-nums">
          <p className="text-title font-bold">{formatKHR(total)}</p>
          <p className="text-meta font-semibold">{formatUSD(total)}</p>
        </div>
      </div>

      {/* History list (this category only) */}
      <div className="pb-2 pt-4">
        <p className="mb-2 text-meta font-semibold text-text-subtle">ប្រវត្តិ​ការ​ចំណាយ</p>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-meta text-text-muted">គ្មាន​ការ​ចំណាយ​ក្នុង​ប្រភេទ​នេះ</p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-lg bg-bg">
            {sorted.map((e: Expense) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-bold text-text">{dateLabel(e.spentAt)}</p>
                  {e.note && <p className="mt-0.5 truncate text-meta text-text-muted">{e.note}</p>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-body-sm font-bold text-debt">−{formatKHR(e.amount)}</p>
                  <p className="text-caption font-semibold text-text-muted">{formatUSD(e.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
