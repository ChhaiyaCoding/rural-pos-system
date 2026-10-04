'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Receipt, X, Banknote, NotebookPen, SplitSquareHorizontal, Ban, type LucideIcon } from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { dateKHFromISO, formatDateOnlyKm, todayISODate, addDaysISODate } from '@/lib/date'
import { ReprintReceipt } from '@/features/sales/components/ReprintReceipt'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill, type PillVariant } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import type { KHR } from '@/types'
import type { Sale } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('km-KH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function ReceiptsPage() {
  const [search,  setSearch]  = useState('')
  const [date,    setDate]    = useState('')          // 'YYYY-MM-DD' filter
  const [reprint, setReprint] = useState<Sale | null>(null)

  const sales = useLiveQuery(
    () => db.sales.where('tenantId').equals(DEMO_TENANT).reverse().sortBy('createdAt'),
    []
  ) ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales.filter((s) => {
      const matchNum  = q === '' || (s.receiptNumber ?? '').toLowerCase().includes(q)
      const matchDate = date === '' || s.createdAt.slice(0, 10) === date
      return matchNum && matchDate
    })
  }, [sales, search, date])

  /* ── Display only: payment styling + group by (Cambodia) day ───── */
  const PAY_UI: Record<Sale['paymentType'], { label: string; pill: PillVariant; tile: string; icon: LucideIcon }> = {
    cash:    { label: 'សាច់ប្រាក់', pill: 'success', tile: 'bg-success-bg text-success', icon: Banknote },
    debt:    { label: 'ជំពាក់',     pill: 'debt',    tile: 'bg-debt-bg text-debt',       icon: NotebookPen },
    partial: { label: 'បង់ខ្លះ',     pill: 'warn',    tile: 'bg-warn-bg text-warn',       icon: SplitSquareHorizontal },
  }
  const today = todayISODate()
  const dayLabel = (day: string) =>
    day === today ? 'ថ្ងៃនេះ' : day === addDaysISODate(today, -1) ? 'ម្សិលមិញ' : formatDateOnlyKm(day)
  const groups: Array<{ day: string; sales: Sale[]; total: KHR }> = []
  for (const sale of filtered) {
    const day = dateKHFromISO(sale.createdAt)
    let g = groups[groups.length - 1]
    if (!g || g.day !== day) { g = { day, sales: [], total: 0 as KHR }; groups.push(g) }
    g.sales.push(sale)
    if (!sale.isVoid) g.total = (g.total + sale.totalAmount) as KHR
  }

  return (
    <div className="mx-auto w-full max-w-3xl md:px-6">

      <PageHeader title="ប្រវត្តិ​វិក្កយបត្រ" subtitle={`${filtered.length} វិក្កយបត្រ`} backHref="/more" className="md:px-0" />

      <div className="space-y-2 px-4 md:px-0">
        {/* Search by receipt number */}
        <SearchInput value={search} onChange={setSearch} placeholder="ស្វែង​លេខ​វិក្កយបត្រ…" />

        {/* Filter by date */}
        <div className="flex items-center gap-2">
          <label className="flex min-h-[52px] flex-1 items-center gap-2 rounded-md border border-line bg-surface px-4">
            <span className="shrink-0 text-meta font-semibold text-text-subtle">ថ្ងៃ៖</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-body text-text outline-none"
            />
          </label>
          {date && (
            <button
              type="button"
              onClick={() => setDate('')}
              className="flex h-[52px] shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-3 text-body-sm font-semibold text-text-subtle active:bg-surface-2"
            >
              <X size={16} aria-hidden="true" /> សម្អាត
            </button>
          )}
        </div>
      </div>

      {/* List — grouped by day */}
      <div className="px-4 pb-6 pt-4 md:px-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt size={30} strokeWidth={1.5} />}
            title={search || date ? 'រក​មិន​ឃើញ​វិក្កយបត្រ' : 'មិន​ទាន់​មាន​វិក្កយបត្រ'}
            description={search || date ? 'សាក​ប្ដូរ​លេខ ឬ ថ្ងៃ​ស្វែងរក' : undefined}
          />
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.day}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-body-sm font-bold text-text">{dayLabel(g.day)}</h2>
                  <span className="text-meta font-semibold tabular-nums text-text-muted">
                    {g.sales.length} · {formatKHR(g.total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.sales.map((sale) => {
                    const pt = PAY_UI[sale.paymentType]
                    const Icon = sale.isVoid ? Ban : pt.icon
                    return (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => setReprint(sale)}
                        className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                      >
                        <span
                          className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-md', sale.isVoid ? 'bg-surface-2 text-text-muted' : pt.tile)}
                          aria-hidden="true"
                        >
                          <Icon size={22} strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm font-bold tabular-nums text-text">
                            #{sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase()}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-meta text-text-muted">{timeLabel(sale.createdAt)}</span>
                            {sale.isVoid
                              ? <Pill variant="neutral">លុបហើយ</Pill>
                              : <Pill variant={pt.pill}>{pt.label}</Pill>}
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <span className={cx('block text-body-sm font-bold', sale.isVoid ? 'text-text-muted line-through' : 'text-text')}>
                            {formatKHR(sale.totalAmount)}
                          </span>
                          <span className={cx('block text-caption font-semibold text-text-muted', sale.isVoid && 'line-through')}>
                            {formatUSD(sale.totalAmount)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Reprint */}
      {reprint && <ReprintReceipt sale={reprint} onClose={() => setReprint(null)} />}
    </div>
  )
}
