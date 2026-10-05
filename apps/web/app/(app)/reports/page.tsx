'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Link from 'next/link'
import {
  TrendingUp, BarChart2, List, Share2, Wallet, Receipt, Banknote, NotebookPen, SplitSquareHorizontal, Ban,
  type LucideIcon,
} from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { startOfTodayISO, startOfDaysAgoISO, dateKHFromISO, todayISODate, addDaysISODate } from '@/lib/date'
import { SaleDetailSheet } from '@/features/sales/components/SaleDetailSheet'
import { ReportExportSheet } from '@/features/reports/components/ReportExportSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatTile } from '@/components/ui/StatTile'
import { MoneyText } from '@/components/ui/MoneyText'
import { ListRow } from '@/components/ui/ListRow'
import { ProductThumb } from '@/components/ui/ProductThumb'
import { Pill, type PillVariant } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import { expenseCategoryUi } from '@/features/expense/categoryUi'
import { expenseCategoryLabel, expenseCategoryEmoji } from '@/services/expense.service'
import { useStoreProfile } from '@/store/storeProfile.store'
import type { Sale } from '@/types'
import type { KHR, TenantId, ProductId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

/* ── Period config ────────────────────────────────────────── */
const PERIODS = [
  { key: 'today', label: 'ថ្ងៃនេះ', days: 1  },
  { key: '7d',    label: '៧ ថ្ងៃ',   days: 7  },
  { key: '30d',   label: '៣០ ថ្ងៃ',  days: 30 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']
type ViewKey   = 'charts' | 'history' | 'profit'

const DAY_SHORT = ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស']

const PAYMENT_CONFIG: Record<
  Sale['paymentType'],
  { label: string; pill: PillVariant; tile: string; icon: LucideIcon }
> = {
  cash:    { label: 'សាច់ប្រាក់', pill: 'success', tile: 'bg-success-bg text-success', icon: Banknote },
  debt:    { label: 'ជំពាក់',     pill: 'debt',    tile: 'bg-debt-bg text-debt',       icon: NotebookPen },
  partial: { label: 'បង់ខ្លះ',     pill: 'warn',    tile: 'bg-warn-bg text-warn',       icon: SplitSquareHorizontal },
}

function getStartISO(key: PeriodKey): string {
  if (key === '7d')  return startOfDaysAgoISO(6)
  if (key === '30d') return startOfDaysAgoISO(29)
  return startOfTodayISO()
}

function dateLabel(iso: string): string {
  const today     = todayISODate()
  const yesterday = addDaysISODate(today, -1)
  if (iso === today)     return 'ថ្ងៃនេះ'
  if (iso === yesterday) return 'ម្សិលមិញ'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('km-KH', { day: 'numeric', month: 'short' })
}

/* ── Page ─────────────────────────────────────────────────── */
export default function ReportsPage() {
  const [period,        setPeriod]        = useState<PeriodKey>('7d')
  const [view,          setView]          = useState<ViewKey>('charts')
  const [detail,        setDetail]        = useState<Sale | null>(null)
  const [showExport,    setShowExport]    = useState(false)

  const { storeName } = useStoreProfile()

  const startISO = useMemo(() => getStartISO(period), [period])
  const days     = PERIODS.find(p => p.key === period)!.days

  /* Single reactive query — includes voided sales for history display */
  const report = useLiveQuery(async () => {
    const [allSales, customers, products] = await Promise.all([
      db.sales
        .where('tenantId').equals(DEMO_TENANT)
        .filter(s => s.createdAt >= startISO)
        .toArray(),
      db.customers.where('tenantId').equals(DEMO_TENANT).filter(c => !c.deletedAt).toArray(),
      db.products.where('tenantId').equals(DEMO_TENANT).filter(p => !p.deletedAt).toArray(),
    ])
    const sales = allSales.filter(s => !s.isVoid)   // charts only count non-void
    const items = sales.length
      ? await db.saleItems.where('saleId').anyOf(sales.map(s => s.id)).toArray()
      : []
    return { sales, allSales, customers, items, products }
  }, [startISO])

  const sales     = report?.sales     ?? []
  const allSales  = report?.allSales  ?? []
  const customers = report?.customers ?? []
  const items     = report?.items     ?? []
  const products  = report?.products  ?? []
  const isLoading = report === undefined

  /* Aggregates */
  const totalRevenue = sales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)
  const cashSales    = sales.filter(s => s.paymentType === 'cash')
  const debtSales    = sales.filter(s => s.paymentType !== 'cash')
  const totalDebt    = customers.reduce((s, c) => s + (c.debtBalance as number), 0) as KHR
  const debtorCount  = customers.filter(c => (c.debtBalance as number) > 0).length

  /* Expenses for the selected period (spentAt date-only ≥ period start, Cambodia) */
  const startDate = addDaysISODate(todayISODate(), -(days - 1))
  const expenses = useLiveQuery(
    () => db.expenses
      .where('tenantId').equals(DEMO_TENANT)
      .filter(e => !e.deletedAt && e.spentAt >= startDate)
      .toArray(),
    [startDate]
  ) ?? []
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount as number), 0) as KHR
  const netProfit     = (totalRevenue - totalExpenses) as KHR

  /* Expense breakdown by category (read-only profit report) */
  const expenseByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + (e.amount as number))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [expenses])
  const maxCatExpense = Math.max(...expenseByCat.map(([, v]) => v), 1)

  /* Daily revenue for bar chart (keyed by Cambodia calendar day) */
  const dailyRevenue = useMemo(() => {
    const today = todayISODate()
    const map = new Map<string, number>()
    for (let i = days - 1; i >= 0; i--) map.set(addDaysISODate(today, -i), 0)
    for (const sale of sales) {
      const key = dateKHFromISO(sale.createdAt)
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + sale.totalAmount)
    }
    return [...map.entries()].map(([date, amount]) => ({ date, amount }))
  }, [sales, days])

  const maxDaily = Math.max(...dailyRevenue.map(d => d.amount), 1)

  /* Top 5 products by revenue */
  /* Quantity sold per product over the period (0 for never-sold) → rank all
     products so we can show both best-sellers and slow-movers. */
  const ranked = useMemo(() => {
    const soldByProduct = new Map<string, { qty: number; revenue: number }>()
    for (const item of items) {
      const prev = soldByProduct.get(item.productId) ?? { qty: 0, revenue: 0 }
      soldByProduct.set(item.productId, { qty: prev.qty + item.qty, revenue: prev.revenue + item.subtotal })
    }
    return products
      .map((p) => {
        const s = soldByProduct.get(p.id) ?? { qty: 0, revenue: 0 }
        return { name: p.nameKm, qty: s.qty, revenue: s.revenue }
      })
      .sort((a, b) => b.qty - a.qty)
  }, [items, products])

  const topProducts    = useMemo(() => ranked.filter((p) => p.qty > 0).slice(0, 5), [ranked])
  const bottomProducts = useMemo(() => [...ranked].reverse().slice(0, 5), [ranked])
  const maxProductQty  = Math.max(ranked[0]?.qty ?? 0, 1)
  const todayISO          = todayISODate()

  /* History: group ALL sales (incl. voided) by date, sorted desc */
  const groupedSales = useMemo(() => {
    const sorted = [...allSales].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const map    = new Map<string, Sale[]>()
    for (const sale of sorted) {
      const key = dateKHFromISO(sale.createdAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(sale)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [allSales])

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto w-full max-w-3xl md:px-6 md:pt-6">

      {/* ── Hero ────────────────────────────────────────────── */}
      <PageHeader
        variant="hero"
        className="md:rounded-xl"
        title="របាយការណ៍"
        backHref="/more"
        actions={
          <Button variant="onDark" icon={<Share2 size={18} strokeWidth={2.25} />} onClick={() => setShowExport(true)}>
            នាំចេញ
          </Button>
        }
      >
        <SegmentedControl
          tone="dark"
          ariaLabel="រយៈពេល"
          items={PERIODS.map(p => ({ value: p.key, label: p.label }))}
          value={period}
          onChange={setPeriod}
        />

        <p className="mt-4 text-meta font-semibold text-ink-300">ចំណេញសុទ្ធ</p>
        {isLoading ? (
          <p className="text-amount-lg font-bold text-white">…</p>
        ) : (
          <MoneyText amount={netProfit} size="xl" tone={netProfit >= 0 ? 'onDark' : 'debtOnDark'} />
        )}

        {/* Mini bar chart — per-day revenue (only when the period has several days) */}
        {days > 1 && (
          <div className="mt-4">
            <div className="flex h-16 items-end gap-0.5" role="img" aria-label="ចំណូលប្រចាំថ្ងៃ">
              {dailyRevenue.map(({ date, amount }) => {
                const heightPct = amount > 0 ? Math.max((amount / maxDaily) * 100, 6) : 0
                const isToday   = date === todayISO
                return (
                  <div key={date} className="flex h-full min-w-0 flex-1 items-end">
                    <div
                      className={cx('w-full rounded-t-[4px] transition-all duration-300', isToday ? 'bg-accent' : 'bg-ink-700')}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            {days <= 7 ? (
              <div className="mt-1.5 flex gap-0.5">
                {dailyRevenue.map(({ date }) => {
                  const isToday = date === todayISO
                  return (
                    <span
                      key={date}
                      className={cx('min-w-0 flex-1 text-center text-caption', isToday ? 'font-bold text-accent' : 'text-ink-300')}
                    >
                      {DAY_SHORT[new Date(date + 'T12:00:00').getDay()]}
                    </span>
                  )
                })}
              </div>
            ) : (
              <div className="mt-1.5 flex justify-between text-caption text-ink-300">
                <span>{dateLabel(dailyRevenue[0]?.date ?? todayISO)}</span>
                <span className="font-bold text-accent">ថ្ងៃនេះ</span>
              </div>
            )}
          </div>
        )}
      </PageHeader>

      <div className="space-y-3 px-4 pb-8 pt-4 md:px-0">

        {/* Income / expenses */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            dot="bg-success"
            label="ចំណូល"
            value={isLoading ? '…' : formatKHR(totalRevenue)}
            sub={isLoading ? undefined : `${formatUSD(totalRevenue)} · ${sales.length} ដង`}
          />
          <StatTile
            dot="bg-debt"
            label="ចំណាយ"
            value={isLoading ? '…' : formatKHR(totalExpenses)}
            sub={isLoading ? undefined : formatUSD(totalExpenses)}
          />
        </div>

        {/* Receipts */}
        <ListRow
          href="/receipts"
          chevron
          leading={
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-bg text-text-subtle" aria-hidden="true">
              <Receipt size={22} strokeWidth={2} />
            </span>
          }
          title="ប្រវត្តិវិក្កយបត្រ"
          meta="មើល និងបោះពុម្ពវិក្កយបត្រឡើងវិញ"
        />

        {/* View toggle — charts / history / profit */}
        <SegmentedControl
          ariaLabel="ទិដ្ឋភាព"
          items={[
            { value: 'charts',  label: 'ក្រាប',   icon: <BarChart2 size={18} strokeWidth={2.25} /> },
            { value: 'history', label: 'ប្រវត្តិ', icon: <List size={18} strokeWidth={2.25} /> },
            { value: 'profit',  label: 'ចំណេញ',  icon: <TrendingUp size={18} strokeWidth={2.25} /> },
          ]}
          value={view}
          onChange={setView}
        />

        {/* ══════════════════════════════════════════════════════
            CHARTS VIEW
        ══════════════════════════════════════════════════════ */}
        {view === 'charts' && (
          <div className="space-y-3">

            {/* Best sellers / slow movers */}
            {sales.length > 0 && ranked.length > 0 && (
              <ProductRankCard top={topProducts} slow={bottomProducts} max={maxProductQty} />
            )}

            {/* Payment breakdown */}
            {sales.length > 0 && (
              <Card>
                <h2 className="mb-3 text-body-sm font-bold text-text">របៀបទូទាត់</h2>
                <div className="space-y-3">
                  <PaymentRow
                    icon={<Banknote size={18} strokeWidth={2.25} />} label="សាច់ប្រាក់"
                    count={cashSales.length} total={sales.length}
                    amount={cashSales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)}
                    barClass="bg-success"
                  />
                  <PaymentRow
                    icon={<NotebookPen size={18} strokeWidth={2.25} />} label="ជំពាក់"
                    count={debtSales.length} total={sales.length}
                    amount={debtSales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)}
                    barClass="bg-debt"
                  />
                </div>
              </Card>
            )}

            {/* Debt summary */}
            {debtorCount > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-debt-bg px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-body-sm font-bold text-debt">ជំពាក់សរុបទាំងអស់</p>
                  <p className="mt-0.5 text-meta text-debt">{debtorCount} នាក់ជំពាក់</p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-title-sm font-bold text-debt">{formatKHR(totalDebt)}</p>
                  <p className="text-meta font-semibold text-debt">{formatUSD(totalDebt)}</p>
                </div>
              </div>
            )}

            {/* Empty */}
            {!isLoading && sales.length === 0 && (
              <EmptyState
                icon={<TrendingUp size={30} strokeWidth={1.5} />}
                title="មិនទាន់មានទិន្នន័យ"
                description="ចាប់ផ្តើមលក់ ដើម្បីមើលរបាយការណ៍"
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            HISTORY VIEW
        ══════════════════════════════════════════════════════ */}
        {view === 'history' && (
          <div>

            {/* Summary bar */}
            {sales.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3">
                <span className="text-meta text-text-subtle">
                  ការលក់ <span className="font-bold text-text">{sales.length}</span> ដង
                </span>
                <span className="text-right tabular-nums">
                  <span className="block text-body font-bold text-text">{formatKHR(totalRevenue)}</span>
                  <span className="block text-caption font-semibold text-text-muted">{formatUSD(totalRevenue)}</span>
                </span>
              </div>
            )}

            {/* List */}
            {isLoading ? (
              <p className="py-16 text-center text-meta text-text-muted">កំពុងផ្ទុក…</p>
            ) : groupedSales.length === 0 ? (
              <EmptyState
                icon={<List size={30} strokeWidth={1.5} />}
                title="គ្មានការលក់"
                description={`ក្នុងអំឡុងពេល${PERIODS.find(p => p.key === period)!.label}នេះ`}
              />
            ) : (
              <div className="space-y-5">
                {groupedSales.map(([dateISO, daySales]) => {
                  const dayTotal = daySales.reduce((s, x) => s + x.totalAmount, 0) as KHR
                  return (
                    <section key={dateISO}>
                      {/* Date group header */}
                      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                        <h2 className="text-body-sm font-bold text-text">{dateLabel(dateISO)}</h2>
                        <span className="text-meta font-semibold tabular-nums text-text-muted">
                          {daySales.length} ដង · {formatKHR(dayTotal)} · {formatUSD(dayTotal)}
                        </span>
                      </div>

                      {/* Sale rows */}
                      <div className="space-y-2">
                        {daySales.map((sale) => {
                          const pt        = PAYMENT_CONFIG[sale.paymentType]
                          const Icon      = sale.isVoid ? Ban : pt.icon
                          const t         = new Date(sale.createdAt)
                          const tStr      = t.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
                          const itemCount = items.filter(i => i.saleId === sale.id).length
                          const debtAmt   = sale.totalAmount - sale.paidAmount
                          const isVoid    = sale.isVoid

                          return (
                            <button
                              key={sale.id}
                              type="button"
                              onClick={() => setDetail(sale)}
                              className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                            >
                              {/* Payment icon */}
                              <span
                                className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-md', isVoid ? 'bg-surface-2 text-text-muted' : pt.tile)}
                                aria-hidden="true"
                              >
                                <Icon size={22} strokeWidth={2} />
                              </span>

                              {/* Info */}
                              <span className="min-w-0 flex-1">
                                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                  {isVoid
                                    ? <Pill variant="neutral">លុបហើយ</Pill>
                                    : <Pill variant={pt.pill}>{pt.label}</Pill>}
                                  {!isVoid && sale.note && (
                                    <span className="truncate text-meta text-text-muted">· {sale.note}</span>
                                  )}
                                </span>
                                <span className="mt-1 block text-meta tabular-nums text-text-muted">
                                  {tStr}
                                  {itemCount > 0 && ` · ${itemCount} មុខ`}
                                </span>
                              </span>

                              {/* Amount */}
                              <span className="shrink-0 text-right tabular-nums">
                                <span className={cx('block text-body-sm font-bold', isVoid ? 'text-text-muted line-through' : 'text-text')}>
                                  {formatKHR(sale.totalAmount)}
                                </span>
                                {!isVoid && (
                                  <span className="block text-caption font-semibold text-text-muted">
                                    {formatUSD(sale.totalAmount)}
                                  </span>
                                )}
                                {!isVoid && sale.paymentType === 'partial' && debtAmt > 0 && (
                                  <span className="mt-0.5 block text-caption font-semibold text-debt">
                                    ជំពាក់ {formatKHR(debtAmt as KHR)} · {formatUSD(debtAmt as KHR)}
                                  </span>
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PROFIT VIEW (read-only — manage expenses in More → ការចំណាយ)
        ══════════════════════════════════════════════════════ */}
        {view === 'profit' && (
          <div className="space-y-3">

            {/* Net profit summary */}
            <Card padding="none" className="divide-y divide-line">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 text-body-sm text-text-subtle">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                  ចំណូល
                </span>
                <span className="text-right tabular-nums">
                  <span className="block text-body-sm font-bold text-text">{formatKHR(totalRevenue)}</span>
                  <span className="block text-caption text-text-muted">{formatUSD(totalRevenue)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 text-body-sm text-text-subtle">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-debt" aria-hidden="true" />
                  ចំណាយ
                </span>
                <span className="text-right tabular-nums">
                  <span className="block text-body-sm font-bold text-debt">{totalExpenses > 0 ? '−' : ''}{formatKHR(totalExpenses)}</span>
                  <span className="block text-caption text-text-muted">{formatUSD(totalExpenses)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-3.5">
                <span className="text-body-sm font-bold text-text">ចំណេញ​សុទ្ធ</span>
                <span className="text-right tabular-nums">
                  <span className={cx('block text-title-sm font-bold', netProfit >= 0 ? 'text-success' : 'text-danger')}>
                    {formatKHR(netProfit)}
                  </span>
                  <span className="block text-caption font-semibold text-text-muted">{formatUSD(netProfit)}</span>
                </span>
              </div>
            </Card>

            {/* Expense breakdown by category */}
            {expenseByCat.length > 0 && (
              <Card>
                <h2 className="mb-3 text-body-sm font-bold text-text">ចំណាយ​តាម​ប្រភេទ</h2>
                <div className="space-y-3">
                  {expenseByCat.map(([cat, amt]) => (
                    <div key={cat}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-body-sm font-semibold text-text">
                          <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', expenseCategoryUi(cat).dot)} aria-hidden="true" />
                          <span className="truncate">{expenseCategoryEmoji(cat)} {expenseCategoryLabel(cat)}</span>
                        </span>
                        <span className="shrink-0 text-body-sm font-bold tabular-nums text-text">{formatKHR(amt as KHR)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-track">
                        <div
                          className={cx('h-full rounded-full transition-all duration-500', expenseCategoryUi(cat).bar)}
                          style={{ width: `${(amt / maxCatExpense) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Manage expenses link */}
            <Link
              href="/expenses"
              className="flex h-12 items-center justify-center gap-2 rounded-md bg-surface text-body-sm font-semibold text-text transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              <Wallet size={18} strokeWidth={2.25} aria-hidden="true" />
              គ្រប់គ្រង​ការ​ចំណាយ
            </Link>
          </div>
        )}
      </div>

      {/* Sale detail sheet */}
      {detail && (
        <SaleDetailSheet
          sale={detail}
          onClose={() => setDetail(null)}
          onVoided={() => setDetail(null)}
        />
      )}

      {/* Export sheet */}
      {showExport && (
        <ReportExportSheet
          onClose={() => setShowExport(false)}
          periodLabel={PERIODS.find(p => p.key === period)!.label}
          storeName={storeName}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          netProfit={netProfit}
          salesCount={sales.length}
          cashCount={cashSales.length}
          cashAmount={cashSales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)}
          debtCount={debtSales.length}
          debtAmount={debtSales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)}
          debtorCount={debtorCount}
          totalDebt={totalDebt}
          topProducts={topProducts}
          expenseByCat={expenseByCat}
          dateRange={(() => {
            const d = new Date()
            const end = d.toLocaleDateString('km-KH', { day: 'numeric', month: 'short' })
            if (period === 'today') return end
            const days = PERIODS.find(p => p.key === period)!.days
            const start = new Date(d)
            start.setDate(start.getDate() - (days - 1))
            return `${start.toLocaleDateString('km-KH', { day: 'numeric', month: 'short' })} – ${end}`
          })()}
        />
      )}
    </div>
  )
}

/* ── Product ranking card (best sellers / slow movers) ────── */
function ProductRankCard({
  top, slow, max,
}: {
  top:  { name: string; qty: number }[]
  slow: { name: string; qty: number }[]
  max:  number
}) {
  const [mode, setMode] = useState<'top' | 'slow'>('top')
  const products = mode === 'top' ? top : slow
  return (
    <Card>
      <SegmentedControl
        ariaLabel="ចំណាត់ថ្នាក់ទំនិញ"
        items={[
          { value: 'top',  label: 'លក់ដាច់' },
          { value: 'slow', label: 'លក់យឺត' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {products.length === 0 ? (
        <p className="py-4 text-center text-meta text-text-muted">—</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {products.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-body-sm font-bold tabular-nums text-text-muted">{i + 1}</span>
              <ProductThumb product={{ id: p.name as ProductId, nameKm: p.name, emoji: '', imageUri: null }} size={48} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-body-sm font-semibold text-text">{p.name}</span>
                  <span className="shrink-0 text-body-sm font-bold tabular-nums text-text">
                    {p.qty}<span className="ml-0.5 text-caption font-semibold text-text-muted">ដង</span>
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                  <span className="block h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(p.qty / max) * 100}%` }} />
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

/* ── PaymentRow helper ────────────────────────────────────── */
function PaymentRow({
  icon, label, count, total, amount, barClass,
}: {
  icon: ReactNode; label: string
  count: number; total: number
  amount: KHR;   barClass: string
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-text-subtle" aria-hidden="true">{icon}</span>
          <span className="text-body-sm font-semibold text-text">{label}</span>
          <span className="text-meta text-text-muted">{count} ដង</span>
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          <span className="text-body-sm font-bold text-text">{formatKHR(amount)}</span>
          <span className="text-caption font-semibold text-text-muted">{formatUSD(amount)}</span>
          <span className="text-caption text-text-muted">{pct}%</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-track">
        <div className={`h-full ${barClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
