'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet } from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { todayISODate, addDaysISODate } from '@/lib/date'
import { ExpenseFormSheet } from '@/features/expense/components/ExpenseFormSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { expenseCategoryLabel, expenseCategoryEmoji } from '@/services/expense.service'
import type { Expense } from '@/types'
import type { KHR, TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

const PERIODS = [
  { key: 'today', label: 'ថ្ងៃនេះ', days: 1  },
  { key: '7d',    label: '៧ ថ្ងៃ',   days: 7  },
  { key: '30d',   label: '៣០ ថ្ងៃ',  days: 30 },
] as const
type PeriodKey = (typeof PERIODS)[number]['key']

function startDate(key: PeriodKey): string {
  if (key === '7d')  return addDaysISODate(todayISODate(), -6)
  if (key === '30d') return addDaysISODate(todayISODate(), -29)
  return todayISODate()
}

function dateLabel(iso: string): string {
  const today     = todayISODate()
  const yesterday = addDaysISODate(today, -1)
  if (iso === today)     return 'ថ្ងៃនេះ'
  if (iso === yesterday) return 'ម្សិលមិញ'
  return new Date(iso + 'T12:00:00').toLocaleDateString('km-KH', { day: 'numeric', month: 'short' })
}

export default function ExpensesPage() {
  const [period,  setPeriod]  = useState<PeriodKey>('30d')
  const [adding,  setAdding]  = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const from = startDate(period)
  const expenses = useLiveQuery(
    () => db.expenses
      .where('tenantId').equals(DEMO_TENANT)
      .filter(e => !e.deletedAt && e.spentAt >= from)
      .toArray(),
    [from]
  ) ?? []

  const total = expenses.reduce((s, e) => s + (e.amount as number), 0) as KHR

  const grouped = useMemo(() => {
    const sorted = [...expenses].sort(
      (a, b) => b.spentAt.localeCompare(a.spentAt) || b.createdAt.localeCompare(a.createdAt)
    )
    const map = new Map<string, Expense[]>()
    for (const e of sorted) {
      if (!map.has(e.spentAt)) map.set(e.spentAt, [])
      map.get(e.spentAt)!.push(e)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [expenses])

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-slate-900">ការចំណាយ</h1>
          <span className="text-[12px] text-slate-400 font-medium">{expenses.length} ដង</span>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1.5 mt-3">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={[
                'flex-1 h-9 rounded-lg text-[12px] font-semibold transition-colors',
                period === p.key ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500 active:bg-slate-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-24 space-y-4 max-w-xl mx-auto">

          {/* Total */}
          <div className="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3.5 flex items-center justify-between">
            <span className="text-[13px] font-bold text-danger-700">ចំណាយ​សរុប</span>
            <div className="text-right">
              <p className="text-[20px] font-extrabold text-danger-700 tabular-nums leading-tight">{formatKHR(total)}</p>
              <p className="text-[12px] font-bold text-primary-600 tabular-nums">{formatUSD(total)}</p>
            </div>
          </div>

          {/* List */}
          {expenses.length === 0 ? (
            <EmptyState
              icon={<Wallet size={30} strokeWidth={1.5} />}
              title="មិន​ទាន់​មាន​ការ​ចំណាយ"
              description="ចុច + ដើម្បី​បន្ថែម​ការ​ចំណាយ"
            />
          ) : (
            grouped.map(([dateISO, dayExpenses]) => {
              const dayTotal = dayExpenses.reduce((s, e) => s + (e.amount as number), 0) as KHR
              return (
                <div key={dateISO} className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[12px] font-bold text-slate-600">{dateLabel(dateISO)}</span>
                    <span className="text-[11px] font-semibold text-danger-600 tabular-nums">−{formatKHR(dayTotal)}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {dayExpenses.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEditing(e)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors"
                      >
                        <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[20px]">
                          {expenseCategoryEmoji(e.categoryId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{expenseCategoryLabel(e.categoryId)}</p>
                          {e.note && <p className="text-[11px] text-slate-400 truncate">{e.note}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[14px] font-bold text-danger-600 tabular-nums">−{formatKHR(e.amount)}</p>
                          <p className="text-[10px] font-bold text-primary-600 tabular-nums">{formatUSD(e.amount)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center active:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="បន្ថែម​ការ​ចំណាយ"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {adding && (
        <ExpenseFormSheet onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />
      )}
      {editing && (
        <ExpenseFormSheet expense={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />
      )}
    </div>
  )
}
