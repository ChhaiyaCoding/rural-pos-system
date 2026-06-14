'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Users, HandCoins, Clock, Wallet } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD, toKHR } from '@/lib/money'
import { formatDateKm, startOfTodayISO } from '@/lib/date'
import { getDueInfo } from '@/lib/dueDate'
import { CustomerFormSheet } from '@/features/debt/components/CustomerFormSheet'
import { CustomerDetailSheet } from '@/features/debt/components/CustomerDetailSheet'
import type { Customer } from '@/types'
import type { KHR, TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

type DebtTab = 'all' | 'outstanding' | 'partial' | 'paid'

interface CustStat { charged: number; paid: number; lastPayment: string | null }

export default function DebtPage() {
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState<DebtTab>('all')
  const [adding,   setAdding]   = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)

  const customers = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter((c) => !c.deletedAt)
      .sortBy('nameKm'),
    []
  ) ?? []

  /* All debt transactions (non-void) — drives per-customer charged/paid/last-payment */
  const txns = useLiveQuery(
    () => db.debtTransactions.where('tenantId').equals(DEMO_TENANT).filter(t => !t.isVoid).toArray(),
    []
  ) ?? []

  const statByCustomer = useMemo(() => {
    const m = new Map<string, CustStat>()
    for (const t of txns) {
      const s = m.get(t.customerId) ?? { charged: 0, paid: 0, lastPayment: null }
      if (t.type === 'charge') s.charged += t.amount as number
      else {
        s.paid += t.amount as number
        if (!s.lastPayment || t.createdAt > s.lastPayment) s.lastPayment = t.createdAt
      }
      m.set(t.customerId, s)
    }
    return m
  }, [txns])

  const stat = (c: Customer): CustStat => statByCustomer.get(c.id) ?? { charged: 0, paid: 0, lastPayment: null }

  /* Per-customer status: paid (cleared) · partial (owes + paid some) · outstanding (owes) · none */
  const statusOf = (c: Customer): 'paid' | 'partial' | 'outstanding' | 'none' => {
    const s = stat(c)
    if (c.debtBalance > 0) return s.paid > 0 ? 'partial' : 'outstanding'
    return s.charged > 0 ? 'paid' : 'none'
  }

  /* ── Dashboard aggregates ──────────────────────────────────── */
  const totalOutstanding = toKHR(customers.reduce((s, c) => s + c.debtBalance, 0))
  const owingCount   = customers.filter((c) => c.debtBalance > 0).length
  const overdueCount = customers.filter((c) => getDueInfo(c).status === 'overdue').length

  const todayStart = useMemo(() => startOfTodayISO(), [])
  const collectedToday = toKHR(
    txns.filter(t => t.type === 'payment' && t.createdAt >= todayStart).reduce((s, t) => s + (t.amount as number), 0)
  )

  /* ── Filters ───────────────────────────────────────────────── */
  const counts = useMemo(() => ({
    all:         customers.length,
    outstanding: customers.filter(c => c.debtBalance > 0).length,
    partial:     customers.filter(c => statusOf(c) === 'partial').length,
    paid:        customers.filter(c => statusOf(c) === 'paid').length,
  }), [customers, statByCustomer])

  const TABS: Array<{ id: DebtTab; label: string; tone: 'primary' | 'danger' | 'warning' | 'success' }> = [
    { id: 'all',         label: 'ទាំងអស់',  tone: 'primary' },
    { id: 'outstanding', label: 'នៅជំពាក់', tone: 'danger'  },
    { id: 'partial',     label: 'បង់ខ្លះ',   tone: 'warning' },
    { id: 'paid',        label: 'សងអស់',    tone: 'success' },
  ]

  const filtered = customers
    .filter((c) =>
      tab === 'all'         ? true
      : tab === 'outstanding' ? c.debtBalance > 0
      : tab === 'partial'     ? statusOf(c) === 'partial'
      : statusOf(c) === 'paid'
    )
    .filter((c) =>
      search === '' ||
      c.nameKm.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
    )

  const STATUS_DOT: Record<string, string> = {
    paid: 'bg-success-500', partial: 'bg-warning-500', outstanding: 'bg-danger-500', none: 'bg-slate-300',
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-slate-900">សៀវភៅបំណុល</h1>
          <span className="text-[12px] text-slate-400 font-medium">{customers.length} នាក់</span>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកឈ្មោះ ឬ លេខទូរស័ព្ទ…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
          />
        </div>

        {/* Filter tabs */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {TABS.map((t) => {
            const isActive = tab === t.id
            const activeBg =
              t.tone === 'danger'  ? 'bg-danger-600 text-white shadow-sm'
              : t.tone === 'warning' ? 'bg-warning-500 text-white shadow-sm'
              : t.tone === 'success' ? 'bg-success-600 text-white shadow-sm'
              : 'bg-primary-600 text-white shadow-sm'
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'min-h-0 shrink-0 h-9 px-4 rounded-full whitespace-nowrap',
                  'text-[13px] font-semibold transition-colors flex items-center gap-1.5',
                  isActive ? activeBg : 'bg-white text-slate-600 border border-slate-200 active:bg-slate-50',
                ].join(' ')}
              >
                {t.label}
                <span className={[
                  'tabular-nums text-[11px] font-bold rounded-full px-1.5 min-w-[18px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                ].join(' ')}>
                  {counts[t.id]}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-24 space-y-4 max-w-xl mx-auto">

          {/* ── Dashboard cards ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet size={14} className="text-danger-600" />
                <p className="text-[11px] font-semibold text-slate-400">បំណុលសរុប</p>
              </div>
              <p className="text-[19px] font-extrabold text-danger-700 tabular-nums leading-tight">{formatKHR(totalOutstanding)}</p>
              <p className="text-[12px] font-bold text-primary-600 tabular-nums">{formatUSD(totalOutstanding)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <HandCoins size={14} className="text-success-600" />
                <p className="text-[11px] font-semibold text-slate-400">ប្រមូលថ្ងៃនេះ</p>
              </div>
              <p className="text-[19px] font-extrabold text-success-700 tabular-nums leading-tight">{formatKHR(collectedToday)}</p>
              <p className="text-[12px] font-bold text-primary-600 tabular-nums">{formatUSD(collectedToday)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={14} className="text-slate-500" />
                <p className="text-[11px] font-semibold text-slate-400">អ្នកជំពាក់</p>
              </div>
              <p className="text-[19px] font-extrabold text-slate-900 tabular-nums leading-tight">{owingCount} <span className="text-[12px] font-semibold text-slate-400">នាក់</span></p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={14} className={overdueCount > 0 ? 'text-danger-600' : 'text-slate-400'} />
                <p className="text-[11px] font-semibold text-slate-400">ផុតកំណត់</p>
              </div>
              <p className={[
                'text-[19px] font-extrabold tabular-nums leading-tight',
                overdueCount > 0 ? 'text-danger-700' : 'text-slate-900',
              ].join(' ')}>{overdueCount} <span className="text-[12px] font-semibold text-slate-400">នាក់</span></p>
            </div>
          </div>

          {/* ── Customer list ───────────────────────────────── */}
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
                <Users size={30} strokeWidth={1.5} className="text-slate-300" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">មិន​ទាន់​មាន​អតិថិជន</p>
              <p className="text-[12px] text-slate-400">ចុច + ដើម្បី​បន្ថែម​អតិថិជន​ដំបូង</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[12px] text-slate-400">
                {search !== ''        ? `រក​មិន​ឃើញ «${search}»`
                : tab === 'outstanding' ? 'គ្មាន​អ្នក​ជំពាក់​ទេ 🎉'
                : tab === 'partial'     ? 'គ្មាន​អ្នក​បង់​ខ្លះ'
                : tab === 'paid'        ? 'មិន​ទាន់​មាន​អ្នក​សង​អស់'
                : 'មិន​ទាន់​មាន​អតិថិជន'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
              {filtered.map((customer) => {
                const s        = stat(customer)
                const status   = statusOf(customer)
                const hasDebt  = customer.debtBalance > 0
                const initial  = customer.nameKm.charAt(0) || '?'
                const due      = getDueInfo(customer)
                const dueLabel =
                  due.daysUntilDue === null ? null
                  : due.daysUntilDue < 0  ? `🔴 ផុត ${-due.daysUntilDue} ថ្ងៃ`
                  : due.daysUntilDue === 0 ? '🟠 សង​ថ្ងៃនេះ'
                  : `🟠 នៅ ${due.daysUntilDue} ថ្ងៃ`
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelected(customer)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors text-left"
                  >
                    {/* Avatar + status dot */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-100">
                        {customer.imageUri ? (
                          <img src={customer.imageUri} alt={customer.nameKm} className="w-full h-full object-cover" />
                        ) : (
                          <div className={[
                            'w-full h-full flex items-center justify-center text-[17px] font-bold',
                            hasDebt ? 'bg-danger-100 text-danger-700' : 'bg-slate-100 text-slate-500',
                          ].join(' ')}>{initial}</div>
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${STATUS_DOT[status]}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-900 truncate">{customer.nameKm}</p>
                      {customer.phone && <p className="text-[12px] text-slate-400">{customer.phone}</p>}
                      {(s.charged > 0 || s.paid > 0) && (
                        <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                          ជំពាក់ {formatKHR(toKHR(s.charged))} · សង {formatKHR(toKHR(s.paid))}
                          {s.lastPayment && <> · ចុង {formatDateKm(s.lastPayment)}</>}
                        </p>
                      )}
                      {(due.status === 'overdue' || due.status === 'due-soon') && dueLabel && (
                        <span className={[
                          'inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          due.status === 'overdue' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700',
                        ].join(' ')}>{dueLabel}</span>
                      )}
                    </div>

                    {/* Remaining */}
                    <div className="shrink-0 text-right">
                      {hasDebt ? (
                        <>
                          <p className={[
                            'text-[15px] font-bold tabular-nums leading-tight',
                            status === 'partial' ? 'text-warning-700' : 'text-danger-600',
                          ].join(' ')}>{formatKHR(customer.debtBalance)}</p>
                          <p className="text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(customer.debtBalance)}</p>
                        </>
                      ) : status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700 bg-success-50 rounded-full px-2 py-0.5">✓ សងអស់</span>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center active:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="បន្ថែមអតិថិជន"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {adding && (
        <CustomerFormSheet onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />
      )}
      {selected && (
        <CustomerDetailSheet customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
