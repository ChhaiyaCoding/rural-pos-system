'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { formatDateOnlyKm, todayISODate, addDaysISODate } from '@/lib/date'
import { expenseCategoryLabel, expenseCategoryEmoji } from '@/services/expense.service'
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
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col shadow-pop animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[20px]">
              {expenseCategoryEmoji(categoryId)}
            </div>
            <span className="text-[16px] font-bold text-slate-900 truncate">{expenseCategoryLabel(categoryId)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={17} />
          </button>
        </div>

        {/* Summary */}
        <div className="shrink-0 px-4 py-4 border-b border-slate-100">
          <div className="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-danger-700">ចំណាយ​សរុប</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{expenses.length} ដង</p>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-extrabold text-danger-700 tabular-nums leading-tight">{formatKHR(total)}</p>
              <p className="text-[12px] font-bold text-primary-600 tabular-nums">≈ {formatUSD(total)}</p>
            </div>
          </div>
        </div>

        {/* History list (this category only) */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">ប្រវត្តិ​ការ​ចំណាយ</p>
          {sorted.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-slate-400">គ្មាន​ការ​ចំណាយ​ក្នុង​ប្រភេទ​នេះ</p>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
              {sorted.map((e: Expense) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-700">{dateLabel(e.spentAt)}</p>
                    {e.note && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{e.note}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-bold text-danger-600 tabular-nums leading-tight">−{formatKHR(e.amount)}</p>
                    <p className="text-[10px] font-bold text-primary-600 tabular-nums">≈ {formatUSD(e.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
