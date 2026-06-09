'use client'

import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD, toKHR } from '@/lib/money'
import { getDueInfo } from '@/lib/dueDate'
import { CustomerFormSheet } from '@/features/debt/components/CustomerFormSheet'
import { CustomerDetailSheet } from '@/features/debt/components/CustomerDetailSheet'
import type { Customer } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

type DebtTab = 'all' | 'owing' | 'paid'

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

  const totalDebt    = toKHR(customers.reduce((s, c) => s + c.debtBalance, 0))
  const owingCount   = customers.filter((c) => c.debtBalance > 0).length
  const paidCount    = customers.filter((c) => c.debtBalance <= 0).length
  const debtorCount  = owingCount
  const overdueCount = customers.filter((c) => getDueInfo(c).status === 'overdue').length
  const dueSoonCount = customers.filter((c) => getDueInfo(c).status === 'due-soon').length

  const TABS: Array<{ id: DebtTab; label: string; count: number; tone: 'primary' | 'danger' | 'success' }> = [
    { id: 'all',   label: 'ទាំងអស់',  count: customers.length, tone: 'primary' },
    { id: 'owing', label: 'នៅជំពាក់', count: owingCount,       tone: 'danger'  },
    { id: 'paid',  label: 'សងអស់',    count: paidCount,        tone: 'success' },
  ]

  const filtered = customers
    .filter((c) =>
      tab === 'all'   ? true
      : tab === 'owing' ? c.debtBalance > 0
      : c.debtBalance <= 0
    )
    .filter((c) =>
      search === '' ||
      c.nameKm.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
    )

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-slate-900">បំណុលអតិថិជន</h1>
          <span className="text-[12px] text-slate-400 font-medium">{customers.length} នាក់</span>
        </div>

        {/* Summary chips */}
        {(debtorCount > 0 || overdueCount > 0 || dueSoonCount > 0) && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {debtorCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-danger-700 bg-danger-50 border border-danger-100 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />
                {debtorCount} នាក់ជំពាក់ · {formatKHR(totalDebt)} · {formatUSD(totalDebt)}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-danger-700 bg-danger-100 border border-danger-200 rounded-full px-2.5 py-1">
                🔴 ផុតថ្ងៃសង {overdueCount} នាក់
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-warning-700 bg-warning-100 border border-warning-200 rounded-full px-2.5 py-1">
                🟠 ជិតដល់ថ្ងៃសង {dueSoonCount} នាក់
              </span>
            )}
          </div>
        )}

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
              : t.tone === 'success' ? 'bg-success-600 text-white shadow-sm'
              : 'bg-primary-600 text-white shadow-sm'
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'min-h-0 shrink-0 h-10 px-4 rounded-full whitespace-nowrap',
                  'text-[13px] font-semibold transition-colors flex items-center gap-1.5',
                  isActive ? activeBg : 'bg-white text-slate-600 border border-slate-200 active:bg-slate-50',
                ].join(' ')}
              >
                {t.label}
                <span className={[
                  'tabular-nums text-[11px] font-bold rounded-full px-1.5 min-w-[18px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                ].join(' ')}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* List */}
      {customers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
            <Users size={30} strokeWidth={1.5} className="text-slate-300" />
          </div>
          <p className="text-[14px] font-semibold text-slate-700">មិនទាន់មានអតិថិជន</p>
          <p className="text-[12px] text-slate-400">ចុច + ដើម្បីបន្ថែមអតិថិជនដំបូង</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[12px] text-slate-400">
            {search !== ''   ? `រកមិនឃើញ «${search}»`
            : tab === 'owing' ? 'គ្មានអ្នកជំពាក់ទេ 🎉'
            : tab === 'paid'  ? 'មិនទាន់មានអ្នកសងអស់'
            : 'មិនទាន់មានអតិថិជន'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.map((customer) => {
            const hasDebt = customer.debtBalance > 0
            const initial = customer.nameKm.charAt(0) || '?'
            const due = getDueInfo(customer)
            const dueLabel =
              due.daysUntilDue === null ? null
              : due.daysUntilDue < 0  ? `🔴 ផុតថ្ងៃសង ${-due.daysUntilDue} ថ្ងៃ`
              : due.daysUntilDue === 0 ? '🟠 ត្រូវសងថ្ងៃនេះ'
              : `🟠 នៅ ${due.daysUntilDue} ថ្ងៃ`
            return (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelected(customer)}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors text-left"
              >
                {/* Avatar — photo or initial letter */}
                <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden border border-slate-100">
                  {customer.imageUri ? (
                    <img
                      src={customer.imageUri}
                      alt={customer.nameKm}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={[
                      'w-full h-full flex items-center justify-center text-[17px] font-bold',
                      hasDebt ? 'bg-danger-100 text-danger-700' : 'bg-slate-100 text-slate-500',
                    ].join(' ')}>
                      {initial}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{customer.nameKm}</p>
                  {customer.phone && (
                    <p className="text-[12px] text-slate-400 mt-0.5">{customer.phone}</p>
                  )}
                  {(due.status === 'overdue' || due.status === 'due-soon') && dueLabel && (
                    <span className={[
                      'inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      due.status === 'overdue' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700',
                    ].join(' ')}>
                      {dueLabel}
                    </span>
                  )}
                </div>

                {/* Balance */}
                <div className="shrink-0 text-right">
                  {hasDebt ? (
                    <>
                      <p className="text-[14px] font-bold text-danger-600 tabular-nums leading-tight">
                        {formatKHR(customer.debtBalance)}
                      </p>
                      <p className="text-[11px] font-bold text-primary-600 tabular-nums">
                        {formatUSD(customer.debtBalance)}
                      </p>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700 bg-success-50 rounded-full px-2 py-0.5">
                      ✓ សងអស់
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center active:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="បន្ថែមអតិថិជន"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Add customer sheet */}
      {adding && (
        <CustomerFormSheet
          onClose={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}

      {/* Customer detail sheet */}
      {selected && (
        <CustomerDetailSheet
          customer={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
