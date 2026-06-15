'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Receipt, X } from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { ReprintReceipt } from '@/features/sales/components/ReprintReceipt'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import type { Sale } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

const PAYMENT: Record<Sale['paymentType'], { label: string; cls: string; emoji: string }> = {
  cash:    { label: 'សាច់ប្រាក់', cls: 'bg-success-100 text-success-700', emoji: '💵' },
  debt:    { label: 'ជំពាក់',    cls: 'bg-danger-100 text-danger-700',   emoji: '📒' },
  partial: { label: 'ផ្នែក',     cls: 'bg-warning-100 text-warning-700', emoji: '🔀' },
}

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

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <h1 className="text-[19px] font-bold text-slate-900">ប្រវត្តិ​វិក្កយបត្រ</h1>

        {/* Search by receipt number */}
        <SearchInput
          className="mt-3"
          value={search}
          onChange={setSearch}
          placeholder="ស្វែង​លេខ​វិក្កយបត្រ…"
        />

        {/* Filter by date */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[12px] text-slate-400 shrink-0">ថ្ងៃ៖</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-900 focus:outline-none focus:border-primary-500"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate('')}
              className="shrink-0 h-9 px-3 rounded-lg border border-slate-200 text-slate-500 text-[12px] active:bg-slate-50 flex items-center gap-1"
            >
              <X size={13} /> សម្អាត
            </button>
          )}
        </div>
      </header>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          fullHeight
          icon={<Receipt size={30} strokeWidth={1.5} />}
          title={search || date ? 'រក​មិន​ឃើញ​វិក្កយបត្រ' : 'មិន​ទាន់​មាន​វិក្កយបត្រ'}
          description={search || date ? 'សាក​ប្ដូរ​លេខ ឬ ថ្ងៃ​ស្វែងរក' : undefined}
        />
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.map((sale) => {
            const pt = PAYMENT[sale.paymentType]
            return (
              <button
                key={sale.id}
                type="button"
                onClick={() => setReprint(sale)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                  sale.isVoid ? 'opacity-50 bg-slate-50' : 'active:bg-slate-50',
                ].join(' ')}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[18px] ${sale.isVoid ? 'bg-slate-100' : pt.cls}`}>
                  {sale.isVoid ? '❌' : pt.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 tabular-nums truncate">
                    #{sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {timeLabel(sale.createdAt)} · {pt.label}
                    {sale.isVoid && <span className="text-danger-500 font-semibold"> · លុបហើយ</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={['text-[14px] font-bold tabular-nums', sale.isVoid ? 'line-through text-slate-400' : 'text-slate-900'].join(' ')}>
                    {formatKHR(sale.totalAmount)}
                  </p>
                  <p className="text-[10px] font-bold text-primary-600 tabular-nums">{formatUSD(sale.totalAmount)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Reprint */}
      {reprint && <ReprintReceipt sale={reprint} onClose={() => setReprint(null)} />}
    </div>
  )
}
