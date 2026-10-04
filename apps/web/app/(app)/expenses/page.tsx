'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet, Package, Lightbulb, House, HardHat, Truck, ReceiptText, type LucideIcon } from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { todayISODate, addDaysISODate } from '@/lib/date'
import { ExpenseFormSheet } from '@/features/expense/components/ExpenseFormSheet'
import { ExpenseCategorySheet } from '@/features/expense/components/ExpenseCategorySheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MoneyText } from '@/components/ui/MoneyText'
import { cx } from '@/components/ui/cx'
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from '@/services/expense.service'
import type { Expense } from '@/types'
import type { KHR, TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

const PERIODS = [
  { key: 'today',  label: 'ថ្ងៃនេះ' },
  { key: '7d',     label: '៧ ថ្ងៃ'  },
  { key: '30d',    label: '៣០ ថ្ងៃ' },
  { key: 'custom', label: 'ផ្ទាល់'  },
] as const
type PeriodKey = (typeof PERIODS)[number]['key']

function dateLabel(iso: string): string {
  const today     = todayISODate()
  const yesterday = addDaysISODate(today, -1)
  if (iso === today)     return 'ថ្ងៃនេះ'
  if (iso === yesterday) return 'ម្សិលមិញ'
  return new Date(iso + 'T12:00:00').toLocaleDateString('km-KH', { day: 'numeric', month: 'short' })
}

export default function ExpensesPage() {
  const [period,     setPeriod]     = useState<PeriodKey>('30d')
  const [customFrom, setCustomFrom] = useState(todayISODate())
  const [customTo,   setCustomTo]   = useState(todayISODate())
  const [adding,     setAdding]     = useState(false)
  const [editing,    setEditing]    = useState<Expense | null>(null)
  const [catDetail,  setCatDetail]  = useState<string | null>(null)

  /* Inclusive date range driving the whole page */
  const { from, to } = useMemo(() => {
    const today = todayISODate()
    if (period === 'today') return { from: today, to: today }
    if (period === '7d')    return { from: addDaysISODate(today, -6),  to: today }
    if (period === '30d')   return { from: addDaysISODate(today, -29), to: today }
    return customFrom <= customTo
      ? { from: customFrom, to: customTo }
      : { from: customTo,   to: customFrom }
  }, [period, customFrom, customTo])

  const expenses = useLiveQuery(
    () => db.expenses
      .where('tenantId').equals(DEMO_TENANT)
      .filter(e => !e.deletedAt && e.spentAt >= from && e.spentAt <= to)
      .toArray(),
    [from, to]
  ) ?? []

  const total = expenses.reduce((s, e) => s + (e.amount as number), 0) as KHR

  /* Per-category totals + counts */
  const byCategory = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>()
    for (const e of expenses) {
      const c = m.get(e.categoryId) ?? { total: 0, count: 0 }
      c.total += e.amount as number
      c.count += 1
      m.set(e.categoryId, c)
    }
    return m
  }, [expenses])

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

  /* ── Display only: category color + icon (same order as EXPENSE_CATEGORIES) ── */
  const CAT_UI: Record<string, { bar: string; dot: string; tile: string; icon: LucideIcon }> = {
    stock:     { bar: 'bg-chart-1', dot: 'bg-chart-1', tile: 'bg-tint-4 text-tint-4-ink', icon: Package },
    utilities: { bar: 'bg-chart-2', dot: 'bg-chart-2', tile: 'bg-tint-1 text-tint-1-ink', icon: Lightbulb },
    rent:      { bar: 'bg-chart-3', dot: 'bg-chart-3', tile: 'bg-tint-10 text-tint-10-ink', icon: House },
    salary:    { bar: 'bg-chart-4', dot: 'bg-chart-4', tile: 'bg-tint-8 text-tint-8-ink', icon: HardHat },
    transport: { bar: 'bg-chart-5', dot: 'bg-chart-5', tile: 'bg-tint-6 text-tint-6-ink', icon: Truck },
    other:     { bar: 'bg-chart-6', dot: 'bg-chart-6', tile: 'bg-tint-3 text-tint-3-ink', icon: ReceiptText },
  }
  const catUi = (id: string) => CAT_UI[id] ?? CAT_UI.other!
  const periodItems = PERIODS.map((p) => ({ value: p.key, label: p.key === 'custom' ? 'ជ្រើសរើស' : p.label }))

  return (
    <div className="mx-auto w-full max-w-3xl md:px-6 md:pt-6">

      {/* ── Hero: period · total · category split ───────────────── */}
      <PageHeader
        variant="hero"
        className="md:rounded-xl"
        title="ការចំណាយ"
        subtitle={`${expenses.length} ដង`}
        backHref="/more"
      >
        <SegmentedControl tone="dark" ariaLabel="រយៈពេល" value={period} onChange={setPeriod} items={periodItems} />

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              max={todayISODate()}
              onChange={(e) => setCustomFrom(e.target.value || todayISODate())}
              aria-label="ចាប់ពីថ្ងៃ"
              className="h-12 min-w-0 flex-1 rounded-md bg-ink-800 px-3 text-body-sm font-semibold text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="shrink-0 text-meta text-ink-300">ដល់</span>
            <input
              type="date"
              value={customTo}
              max={todayISODate()}
              onChange={(e) => setCustomTo(e.target.value || todayISODate())}
              aria-label="ដល់ថ្ងៃ"
              className="h-12 min-w-0 flex-1 rounded-md bg-ink-800 px-3 text-body-sm font-semibold text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        <p className="mt-4 text-meta font-semibold text-ink-300">ចំណាយ​សរុប</p>
        <MoneyText amount={total} size="xl" tone="debtOnDark" />

        {/* Stacked category bar */}
        {total > 0 && (
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-800" role="img" aria-label="ចំណាយតាមប្រភេទ">
            {EXPENSE_CATEGORIES.map((cat) => {
              const t = byCategory.get(cat.id)?.total ?? 0
              if (t <= 0) return null
              return <span key={cat.id} className={catUi(cat.id).bar} style={{ width: `${(t / total) * 100}%` }} />
            })}
          </div>
        )}
      </PageHeader>

      <div className="space-y-5 px-4 pb-28 pt-5 md:px-0 md:pb-24">

        {/* Category cards */}
        <section>
          <h2 className="mb-2 px-1 text-body-sm font-bold text-text">តាមប្រភេទ</h2>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {EXPENSE_CATEGORIES.map((cat) => {
              const stat = byCategory.get(cat.id) ?? { total: 0, count: 0 }
              const ui = catUi(cat.id)
              const Icon = ui.icon
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatDetail(cat.id)}
                  className="rounded-lg bg-surface p-3.5 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                >
                  <span className="mb-2 flex items-center gap-2">
                    <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', ui.tile)} aria-hidden="true">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 text-meta font-bold leading-tight text-text">{cat.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', ui.dot)} aria-hidden="true" />
                    <MoneyText amount={stat.total as KHR} />
                  </span>
                  <span className="mt-1 block text-caption text-text-muted">{stat.count} ដង</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* History */}
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
              <section key={dateISO}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-body-sm font-bold text-text">{dateLabel(dateISO)}</h2>
                  <span className="text-meta font-semibold tabular-nums text-debt">−{formatKHR(dayTotal)}</span>
                </div>
                <div className="space-y-2">
                  {dayExpenses.map((e) => {
                    const ui = catUi(e.categoryId)
                    const Icon = ui.icon
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEditing(e)}
                        className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                      >
                        <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-md', ui.tile)} aria-hidden="true">
                          <Icon size={22} strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-sm font-semibold text-text">{expenseCategoryLabel(e.categoryId)}</span>
                          {e.note && <span className="block truncate text-meta text-text-muted">{e.note}</span>}
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <span className="block text-body-sm font-bold text-debt">−{formatKHR(e.amount)}</span>
                          <span className="block text-caption font-semibold text-text-muted">{formatUSD(e.amount)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* Floating accent "new expense" */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-[calc(108px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-accent pl-4 pr-5 text-body font-bold text-ink-900 shadow-fab transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 md:bottom-6 md:right-6"
      >
        <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
        ចំណាយថ្មី
      </button>

      {adding && (
        <ExpenseFormSheet onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />
      )}
      {editing && (
        <ExpenseFormSheet expense={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />
      )}
      {catDetail && (
        <ExpenseCategorySheet categoryId={catDetail} from={from} to={to} onClose={() => setCatDetail(null)} />
      )}
    </div>
  )
}
