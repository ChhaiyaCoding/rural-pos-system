'use client'

import { useMemo } from 'react'
import {
  X, Phone, MapPin, FileText, Pencil, Receipt, NotebookText, ChevronRight,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { formatDateKm, formatDateTimeKm } from '@/lib/date'
import type { Customer, Sale } from '@/types'
import type { TenantId, CustomerId, KHR } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  customer:      Customer
  onClose:       () => void
  onEdit:        (c: Customer) => void
  onViewLedger:  (c: Customer) => void
  onOpenReceipt: (s: Sale) => void
}

const PAYMENT: Record<Sale['paymentType'], { label: string; cls: string; emoji: string }> = {
  cash:    { label: 'សាច់ប្រាក់', cls: 'bg-success-100 text-success-700', emoji: '💵' },
  debt:    { label: 'ជំពាក់',    cls: 'bg-danger-100 text-danger-700',   emoji: '📒' },
  partial: { label: 'ផ្នែក',     cls: 'bg-warning-100 text-warning-700', emoji: '🔀' },
}

export function CustomerProfileSheet({ customer, onClose, onEdit, onViewLedger, onOpenReceipt }: Props) {
  /* Live customer (balance + info update in real-time) */
  const live = useLiveQuery(() => db.customers.get(customer.id), [customer.id]) ?? customer

  /* This customer's sales (non-void), newest first */
  const sales = useLiveQuery(
    () => db.sales
      .where('tenantId').equals(DEMO_TENANT)
      .filter(s => s.customerId === customer.id && !s.isVoid)
      .toArray(),
    [customer.id]
  ) ?? []

  /* This customer's debt transactions (non-void) */
  const debtTxns = useLiveQuery(
    () => db.debtTransactions
      .where('tenantId').equals(DEMO_TENANT)
      .filter(t => t.customerId === customer.id && !t.isVoid)
      .toArray(),
    [customer.id]
  ) ?? []

  const sortedSales = useMemo(
    () => [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales]
  )

  /* Stats */
  const totalPurchases = sales.reduce((s, x) => s + (x.totalAmount as number), 0) as KHR
  const invoiceCount   = sales.length
  const lastPurchase   = sortedSales[0]?.createdAt ?? null

  /* Debt summary */
  const totalCharged = debtTxns.filter(t => t.type === 'charge').reduce((s, t) => s + (t.amount as number), 0) as KHR
  const totalPaid    = debtTxns.filter(t => t.type === 'payment').reduce((s, t) => s + (t.amount as number), 0) as KHR
  const remaining    = live.debtBalance
  const hasDebt      = (remaining as number) > 0
  const initial      = live.nameKm.charAt(0) || '?'

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
          <span className="text-[16px] font-bold text-slate-900">ព័ត៌មានអតិថិជន</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(live)}
              className="h-9 px-3 flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 text-[12px] font-bold active:bg-primary-100"
            >
              <Pencil size={14} strokeWidth={2.25} /> កែ
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="បិទ"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Profile card */}
          <div className="px-4 py-5 flex items-start gap-4 border-b border-slate-100">
            <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
              {live.imageUri ? (
                <img src={live.imageUri} alt={live.nameKm} className="w-full h-full object-cover" />
              ) : (
                <div className={[
                  'w-full h-full flex items-center justify-center text-[26px] font-bold',
                  hasDebt ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700',
                ].join(' ')}>
                  {initial}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[17px] font-bold text-slate-900">{live.nameKm}</p>
              {live.phone && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <span className="text-[13px] text-slate-500">{live.phone}</span>
                </div>
              )}
              {live.address && (
                <div className="flex items-start gap-1.5 mt-1">
                  <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[12px] text-slate-500 leading-snug">{live.address}</span>
                </div>
              )}
              {live.note && (
                <div className="flex items-start gap-1.5 mt-1">
                  <FileText size={12} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[12px] text-slate-500 leading-snug">{live.note}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-4 grid grid-cols-3 gap-2 border-b border-slate-100">
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5">ការទិញសរុប</p>
              <p className="text-[14px] font-extrabold text-slate-900 tabular-nums leading-tight">{formatKHR(totalPurchases)}</p>
              <p className="text-[10px] font-bold text-primary-600 tabular-nums">{formatUSD(totalPurchases)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5">វិក្កយបត្រ</p>
              <p className="text-[18px] font-extrabold text-slate-900 tabular-nums leading-tight">{invoiceCount}</p>
              <p className="text-[10px] text-slate-400">ដង</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5">ទិញចុងក្រោយ</p>
              <p className="text-[12px] font-bold text-slate-700 leading-tight mt-1">
                {lastPurchase ? formatDateKm(lastPurchase) : '—'}
              </p>
            </div>
          </div>

          {/* Debt summary */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">សង្ខេបបំណុល</p>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">ជំពាក់សរុប</p>
                  <p className="text-[14px] font-bold text-slate-800 tabular-nums">{formatKHR(totalCharged)}</p>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">បានសង</p>
                  <p className="text-[14px] font-bold text-success-700 tabular-nums">{formatKHR(totalPaid)}</p>
                </div>
              </div>
              <div className={[
                'flex items-center justify-between px-4 py-3 border-t border-slate-100',
                hasDebt ? 'bg-danger-50' : 'bg-success-50',
              ].join(' ')}>
                <span className={['text-[13px] font-bold', hasDebt ? 'text-danger-700' : 'text-success-700'].join(' ')}>
                  នៅសល់
                </span>
                <div className="text-right">
                  <span className={['block text-[18px] font-extrabold tabular-nums leading-tight', hasDebt ? 'text-danger-700' : 'text-success-700'].join(' ')}>
                    {formatKHR(remaining)}
                  </span>
                  <span className="block text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(remaining)}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onViewLedger(live)}
              className="mt-2.5 w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-[14px] flex items-center justify-center gap-2 active:bg-slate-50 transition-colors"
            >
              <NotebookText size={16} strokeWidth={2.25} />
              មើលសៀវភៅបំណុល
            </button>
          </div>

          {/* Purchase history */}
          <div className="px-4 pt-4 pb-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">ប្រវត្តិ​ការ​ទិញ</p>
            {sortedSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <Receipt size={28} strokeWidth={1.5} className="text-slate-300" />
                <p className="text-[13px] text-slate-400">មិន​ទាន់​មាន​ការ​ទិញ</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-card divide-y divide-slate-100 overflow-hidden">
                {sortedSales.map((sale) => {
                  const pt = PAYMENT[sale.paymentType]
                  return (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => onOpenReceipt(sale)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors"
                    >
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[16px] ${pt.cls}`}>
                        {pt.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-900 tabular-nums truncate">
                          #{sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-slate-400">{formatDateTimeKm(sale.createdAt)} · {pt.label}</p>
                      </div>
                      <div className="shrink-0 text-right flex items-center gap-1">
                        <div>
                          <p className="text-[14px] font-bold text-slate-900 tabular-nums leading-tight">{formatKHR(sale.totalAmount)}</p>
                          <p className="text-[10px] font-bold text-primary-600 tabular-nums">{formatUSD(sale.totalAmount)}</p>
                        </div>
                        <ChevronRight size={15} className="text-slate-300" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
