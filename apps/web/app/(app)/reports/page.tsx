'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Link from 'next/link'
import { TrendingUp, BarChart2, List, Share2, Wallet, Receipt } from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { startOfTodayISO, startOfDaysAgoISO, dateKHFromISO, todayISODate, addDaysISODate } from '@/lib/date'
import { SaleDetailSheet } from '@/features/sales/components/SaleDetailSheet'
import { ReportExportSheet } from '@/features/reports/components/ReportExportSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { expenseCategoryLabel, expenseCategoryEmoji } from '@/services/expense.service'
import { useStoreProfile } from '@/store/storeProfile.store'
import type { Sale } from '@/types'
import type { KHR, TenantId } from '@/types/branded'

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
  { label: string; cls: string; emoji: string }
> = {
  cash:    { label: 'សាច់ប្រាក់', cls: 'bg-success-100 text-success-700',  emoji: '💵' },
  debt:    { label: 'ជំពាក់',    cls: 'bg-danger-100 text-danger-700',    emoji: '📒' },
  partial: { label: 'ផ្នែក',     cls: 'bg-warning-100 text-warning-700',  emoji: '🔀' },
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
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-slate-900">របាយការណ៍</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/receipts"
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 text-slate-600 text-[12px] font-bold active:bg-slate-200 transition-colors"
            >
              <Receipt size={14} strokeWidth={2.5} />
              វិក្កយបត្រ
            </Link>
            <button
              type="button"
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary-50 text-primary-700 text-[12px] font-bold active:bg-primary-100 transition-colors"
            >
              <Share2 size={14} strokeWidth={2.5} />
              នាំចេញ
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1.5 mt-3">
          <button
            type="button"
            onClick={() => setView('charts')}
            className={[
              'flex-1 h-9 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5',
              view === 'charts'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 active:bg-slate-200',
            ].join(' ')}
          >
            <BarChart2 size={14} strokeWidth={2.5} />
            ក្រាប
          </button>
          <button
            type="button"
            onClick={() => setView('history')}
            className={[
              'flex-1 h-9 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5',
              view === 'history'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 active:bg-slate-200',
            ].join(' ')}
          >
            <List size={14} strokeWidth={2.5} />
            ប្រវត្តិ
          </button>
          <button
            type="button"
            onClick={() => setView('profit')}
            className={[
              'flex-1 h-9 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5',
              view === 'profit'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 active:bg-slate-200',
            ].join(' ')}
          >
            <TrendingUp size={14} strokeWidth={2.5} />
            ចំណេញ
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1.5 mt-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={[
                'flex-1 h-9 rounded-lg text-[12px] font-semibold transition-colors',
                period === p.key
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 active:bg-slate-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
       <div className="max-w-xl mx-auto">

        {/* ══════════════════════════════════════════════════════
            CHARTS VIEW
        ══════════════════════════════════════════════════════ */}
        {view === 'charts' && (
          <div className="px-4 py-4 space-y-4 pb-8">

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border bg-primary-50 border-primary-100 p-3">
                <p className="text-[18px] mb-1.5">💰</p>
                <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wide leading-none mb-1.5">ចំណូល</p>
                <p className="text-[13px] font-extrabold text-primary-800 tabular-nums leading-tight break-all">
                  {isLoading ? '…' : formatKHR(totalRevenue)}
                </p>
                <p className="text-[11px] font-bold text-primary-500 tabular-nums">
                  {isLoading ? '' : formatUSD(totalRevenue)}
                </p>
              </div>
              <div className="rounded-2xl border bg-success-50 border-success-100 p-3">
                <p className="text-[18px] mb-1.5">🛒</p>
                <p className="text-[10px] font-bold text-success-500 uppercase tracking-wide leading-none mb-1.5">ការលក់</p>
                <p className="text-[20px] font-extrabold text-success-800 tabular-nums leading-tight">
                  {isLoading ? '…' : sales.length}
                  <span className="text-[11px] font-semibold ml-0.5 opacity-70">ដង</span>
                </p>
              </div>
              <div className="rounded-2xl border bg-danger-50 border-danger-100 p-3">
                <p className="text-[18px] mb-1.5">📒</p>
                <p className="text-[10px] font-bold text-danger-500 uppercase tracking-wide leading-none mb-1.5">ជំពាក់</p>
                <p className="text-[13px] font-extrabold text-danger-800 tabular-nums leading-tight break-all">
                  {isLoading ? '…' : formatKHR(totalDebt)}
                </p>
                <p className="text-[11px] font-bold text-danger-500 tabular-nums">
                  {isLoading ? '' : formatUSD(totalDebt)}
                </p>
              </div>
            </div>

            {/* Bar chart */}
            {days > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-4 pt-4 pb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  ចំណូលប្រចាំថ្ងៃ
                </p>
                <div className="flex items-end gap-0.5" style={{ height: 80 }}>
                  {dailyRevenue.map(({ date, amount }) => {
                    const heightPct = amount > 0 ? Math.max((amount / maxDaily) * 100, 6) : 0
                    const isToday   = date === todayISO
                    const d         = new Date(date + 'T12:00:00')
                    const label     = days <= 7
                      ? DAY_SHORT[d.getDay()]
                      : String(d.getDate())
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1 h-full min-w-0">
                        <div className="flex-1 w-full flex items-end">
                          <div
                            className={['w-full rounded-t-sm transition-all duration-300', isToday ? 'bg-primary-500' : 'bg-primary-200'].join(' ')}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className={['text-[7px] leading-none shrink-0 font-medium', isToday ? 'text-primary-600 font-bold' : 'text-slate-400'].join(' ')}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 px-0.5">
                  <span className="text-[9px] text-slate-300">0</span>
                  <span className="text-[9px] text-slate-300">{formatKHR(maxDaily as KHR)}</span>
                </div>
              </div>
            )}

            {/* Payment breakdown */}
            {sales.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-4 pt-4 pb-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  របៀបទូទាត់
                </p>
                <div className="space-y-3">
                  <PaymentRow
                    emoji="💵" label="សាច់ប្រាក់"
                    count={cashSales.length} total={sales.length}
                    amount={cashSales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)}
                    barClass="bg-success-500"
                  />
                  <PaymentRow
                    emoji="📒" label="ជំពាក់"
                    count={debtSales.length} total={sales.length}
                    amount={debtSales.reduce((s, x) => (s + x.totalAmount) as KHR, 0 as KHR)}
                    barClass="bg-danger-400"
                  />
                </div>
              </div>
            )}

            {/* Best sellers vs slow movers — side by side */}
            {sales.length > 0 && ranked.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <ProductRankCard title="🔥 លក់ដាច់" products={topProducts} max={maxProductQty} barCls="bg-success-500" />
                <ProductRankCard title="🐢 លក់យឺត" products={bottomProducts} max={maxProductQty} barCls="bg-slate-300" />
              </div>
            )}

            {/* Debt summary */}
            {debtorCount > 0 && (
              <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-danger-700">ជំពាក់សរុបទាំងអស់</p>
                  <p className="text-[11px] text-danger-500 mt-0.5">{debtorCount} នាក់ជំពាក់</p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-extrabold text-danger-700 tabular-nums">{formatKHR(totalDebt)}</p>
                  <p className="text-[12px] font-bold text-primary-600 tabular-nums">{formatUSD(totalDebt)}</p>
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
          <div className="pb-8">

            {/* Summary bar */}
            {sales.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <span className="text-[12px] text-slate-500">
                  ការលក់ <span className="font-bold text-slate-800">{sales.length}</span> ដង
                </span>
                <span className="text-right">
                  <span className="block text-[14px] font-extrabold text-primary-700 tabular-nums">
                    {formatKHR(totalRevenue)}
                  </span>
                  <span className="block text-[10px] font-bold text-primary-500 tabular-nums">
                    {formatUSD(totalRevenue)}
                  </span>
                </span>
              </div>
            )}

            {/* List */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <p className="text-[12px] text-slate-400">កំពុងផ្ទុក…</p>
              </div>
            ) : groupedSales.length === 0 ? (
              <EmptyState
                icon={<List size={30} strokeWidth={1.5} />}
                title="គ្មានការលក់"
                description={`ក្នុងអំឡុងពេល${PERIODS.find(p => p.key === period)!.label}នេះ`}
              />
            ) : (
              groupedSales.map(([dateISO, daySales]) => {
                const dayTotal = daySales.reduce((s, x) => s + x.totalAmount, 0) as KHR
                return (
                  <div key={dateISO}>
                    {/* Date group header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-y border-slate-100 sticky top-0 z-10">
                      <span className="text-[12px] font-bold text-slate-600">
                        {dateLabel(dateISO)}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                        {daySales.length} ដង · {formatKHR(dayTotal)} · <span className="text-primary-600">{formatUSD(dayTotal)}</span>
                      </span>
                    </div>

                    {/* Sale rows */}
                    <div className="divide-y divide-slate-50">
                      {daySales.map((sale) => {
                        const pt        = PAYMENT_CONFIG[sale.paymentType]
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
                            className={[
                              'w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left',
                              isVoid ? 'opacity-50 bg-slate-50' : 'active:bg-slate-50',
                            ].join(' ')}
                          >
                            {/* Payment icon */}
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[20px] ${isVoid ? 'bg-slate-100 text-slate-400' : pt.cls}`}>
                              {isVoid ? '❌' : pt.emoji}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={['text-[13px] font-semibold shrink-0', isVoid ? 'text-slate-400 line-through' : 'text-slate-800'].join(' ')}>
                                  {pt.label}
                                </span>
                                {isVoid && (
                                  <span className="text-[10px] font-bold text-danger-500 bg-danger-50 rounded-full px-1.5 py-0.5 shrink-0">
                                    លុបហើយ
                                  </span>
                                )}
                                {!isVoid && sale.note && (
                                  <span className="text-[11px] text-slate-400 truncate">
                                    · {sale.note}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                {tStr}
                                {itemCount > 0 && ` · ${itemCount} មុខ`}
                              </p>
                            </div>

                            {/* Amount */}
                            <div className="shrink-0 text-right">
                              <p className={['text-[15px] font-bold tabular-nums', isVoid ? 'line-through text-slate-400' : 'text-slate-900'].join(' ')}>
                                {formatKHR(sale.totalAmount)}
                              </p>
                              {!isVoid && (
                                <p className="text-[10px] font-bold text-primary-600 tabular-nums">
                                  {formatUSD(sale.totalAmount)}
                                </p>
                              )}
                              {!isVoid && sale.paymentType === 'partial' && debtAmt > 0 && (
                                <p className="text-[10px] text-danger-500 tabular-nums mt-0.5">
                                  ជំពាក់ {formatKHR(debtAmt as KHR)} · {formatUSD(debtAmt as KHR)}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PROFIT VIEW (read-only — manage expenses in More → ការចំណាយ)
        ══════════════════════════════════════════════════════ */}
        {view === 'profit' && (
          <div className="px-4 pt-4 pb-8 space-y-4">

            {/* Net profit summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-success-50 border border-success-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-success-600 mb-0.5">ចំណូល</p>
                  <p className="text-[15px] font-extrabold text-success-800 tabular-nums leading-tight">{formatKHR(totalRevenue)}</p>
                  <p className="text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(totalRevenue)}</p>
                </div>
                <div className="rounded-xl bg-danger-50 border border-danger-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-danger-600 mb-0.5">ចំណាយ</p>
                  <p className="text-[15px] font-extrabold text-danger-700 tabular-nums leading-tight">{formatKHR(totalExpenses)}</p>
                  <p className="text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(totalExpenses)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="text-[13px] font-bold text-slate-500">ចំណេញ​សុទ្ធ</span>
                <div className="text-right">
                  <span className={[
                    'block text-[20px] font-extrabold tabular-nums leading-tight',
                    netProfit >= 0 ? 'text-success-700' : 'text-danger-700',
                  ].join(' ')}>
                    {formatKHR(netProfit)}
                  </span>
                  <span className="block text-[12px] font-bold text-primary-600 tabular-nums">{formatUSD(netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Expense breakdown by category */}
            {expenseByCat.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-4 pt-4 pb-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">ចំណាយ​តាម​ប្រភេទ</p>
                <div className="space-y-3">
                  {expenseByCat.map(([cat, amt]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-slate-700">
                          {expenseCategoryEmoji(cat)} {expenseCategoryLabel(cat)}
                        </span>
                        <span className="text-[12px] font-bold text-slate-700 tabular-nums">{formatKHR(amt as KHR)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-danger-400 rounded-full transition-all duration-500" style={{ width: `${(amt / maxCatExpense) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manage expenses link */}
            <Link
              href="/expenses"
              className="flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-[14px] active:bg-slate-50 transition-colors"
            >
              <Wallet size={16} strokeWidth={2.25} />
              គ្រប់គ្រង​ការ​ចំណាយ
            </Link>
          </div>
        )}

       </div>
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
  title, products, max, barCls,
}: {
  title: string
  products: { name: string; qty: number }[]
  max: number
  barCls: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-3 pt-3 pb-3">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">{title}</p>
      {products.length === 0 ? (
        <p className="text-[11px] text-slate-400 py-2 text-center">—</p>
      ) : (
        <div className="space-y-2.5">
          {products.map((p, i) => (
            <div key={`${p.name}-${i}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="shrink-0 w-[16px] h-[16px] rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-black">
                  {i + 1}
                </span>
                <span className="text-[11px] font-semibold text-slate-700 truncate flex-1">{p.name}</span>
                <span className="text-[11px] font-bold text-slate-800 tabular-nums shrink-0">
                  {p.qty}<span className="text-[9px] font-semibold text-slate-400 ml-0.5">ដង</span>
                </span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${barCls} rounded-full transition-all duration-500`} style={{ width: `${(p.qty / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── PaymentRow helper ────────────────────────────────────── */
function PaymentRow({
  emoji, label, count, total, amount, barClass,
}: {
  emoji: string; label: string
  count: number; total: number
  amount: KHR;   barClass: string
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]">{emoji}</span>
          <span className="text-[13px] font-semibold text-slate-700">{label}</span>
          <span className="text-[11px] text-slate-400">{count} ដង</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[12px] font-bold text-slate-800 tabular-nums">{formatKHR(amount)}</span>
          <span className="text-[10px] font-bold text-primary-600 tabular-nums">{formatUSD(amount)}</span>
          <span className="text-[10px] text-slate-400">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
