'use client'

import { useState } from 'react'
import { X, Receipt, User, Trash2, AlertTriangle, Printer } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { saleService } from '@/services/sale.service'
import { formatKHR } from '@/lib/money'
import { ReprintReceipt } from './ReprintReceipt'
import type { Sale } from '@/types'
import type { KHR, TenantId, SaleId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  sale:    Sale
  onClose: () => void
  onVoided?: () => void
}

const PAYMENT_CONFIG: Record<
  Sale['paymentType'],
  { label: string; cls: string; dotCls: string; emoji: string }
> = {
  cash:    { label: 'សាច់ប្រាក់', cls: 'bg-success-100 text-success-700',  dotCls: 'bg-success-500',  emoji: '💵' },
  debt:    { label: 'ជំពាក់',    cls: 'bg-danger-100 text-danger-700',    dotCls: 'bg-danger-500',   emoji: '📒' },
  partial: { label: 'ទូទាត់ផ្នែក', cls: 'bg-warning-100 text-warning-700', dotCls: 'bg-warning-500',  emoji: '🔀' },
}

export function SaleDetailSheet({ sale, onClose, onVoided }: Props) {
  const [confirmVoid, setConfirmVoid] = useState(false)
  const [voiding,     setVoiding]     = useState(false)
  const [voidDone,    setVoidDone]    = useState(false)
  const [showReprint, setShowReprint] = useState(false)

  const items = useLiveQuery(
    () => db.saleItems.where('saleId').equals(sale.id).toArray(),
    [sale.id]
  ) ?? []

  const customer = useLiveQuery(async () => {
    if (!sale.customerId) return undefined
    return db.customers.get(sale.customerId)
  }, [sale.customerId])

  /* Live sale — reflects isVoid after voiding */
  const liveSale = useLiveQuery(
    () => db.sales.get(sale.id),
    [sale.id]
  ) ?? sale

  const pt          = PAYMENT_CONFIG[liveSale.paymentType]
  const d           = new Date(liveSale.createdAt)
  const timeStr     = d.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr     = d.toLocaleDateString('km-KH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const debtAmount  = (liveSale.totalAmount - liveSale.paidAmount) as KHR
  const isVoid      = liveSale.isVoid

  /* ── Handle void ────────────────────────────────── */
  const handleVoid = async () => {
    if (voiding || !confirmVoid) return
    setVoiding(true)
    try {
      const result = await saleService.voidSale(sale.id as SaleId, DEMO_TENANT)
      if (result.ok) {
        setVoidDone(true)
        setConfirmVoid(false)
        setTimeout(() => {
          onVoided?.()
          onClose()
        }, 1500)
      }
    } finally {
      setVoiding(false)
    }
  }

  /* ─────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/70"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt size={17} strokeWidth={2.25} className={isVoid ? 'text-slate-400' : 'text-primary-500'} />
            <span className="text-[15px] font-bold text-slate-900">លម្អិតការលក់</span>
            {isVoid && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger-600 bg-danger-50 border border-danger-200 rounded-full px-2 py-0.5">
                ❌ លុបហើយ
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReprint(true)}
              className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 text-[12px] font-bold active:bg-primary-100"
            >
              <Printer size={14} strokeWidth={2.25} /> បោះពុម្ព
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────── */}
        <div className={['flex-1 overflow-y-auto', isVoid ? 'opacity-60' : ''].join(' ')}>

          {/* Void success banner */}
          {voidDone && (
            <div className="mx-4 mt-4 rounded-xl bg-success-50 border border-success-200 px-4 py-3 flex items-center gap-3">
              <span className="text-[22px]">✅</span>
              <div>
                <p className="text-[13px] font-bold text-success-800">លុបការលក់ជោគជ័យ!</p>
                <p className="text-[11px] text-success-600">ស្តុកត្រូវបានបន្ថែមត្រឡប់ + បំណុលត្រូវបានកាត់</p>
              </div>
            </div>
          )}

          {/* Sale meta */}
          <div className="px-4 pt-4 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-[12px] text-slate-400">{dateStr}</p>
                <p className={['text-[28px] font-extrabold tabular-nums tracking-tight leading-tight mt-0.5', isVoid ? 'text-slate-400 line-through' : 'text-slate-900'].join(' ')}>
                  {formatKHR(liveSale.totalAmount)}
                </p>
              </div>
              <span className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 ${pt.cls}`}>
                {pt.emoji} {pt.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-600">
                🕐 {timeStr}
              </span>
              {customer && (
                <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  <User size={11} />
                  {customer.nameKm}
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-600">
                🛒 {items.length} មុខ
              </span>
            </div>

            {liveSale.paymentType === 'partial' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-success-50 border border-success-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-success-600">ទូទាត់ហើយ</p>
                  <p className="text-[15px] font-extrabold text-success-800 tabular-nums">
                    {formatKHR(liveSale.paidAmount)}
                  </p>
                </div>
                <div className="rounded-xl bg-danger-50 border border-danger-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-danger-600">នៅជំពាក់</p>
                  <p className="text-[15px] font-extrabold text-danger-700 tabular-nums">
                    {formatKHR(debtAmount > 0 ? debtAmount : 0 as KHR)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              បញ្ជីទំនិញ
            </p>
            <div className="divide-y divide-slate-50">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-800 leading-snug truncate">{item.nameKm}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      {formatKHR(item.unitPrice)} × {item.qty}
                    </p>
                  </div>
                  <p className="text-[14px] font-bold text-slate-900 tabular-nums shrink-0">
                    {formatKHR(item.subtotal)}
                  </p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-[13px] text-slate-400">គ្មានទំនិញ</p>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mx-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
            <span className="text-[14px] font-bold text-slate-600">សរុប</span>
            <span className={['text-[20px] font-extrabold tabular-nums', isVoid ? 'line-through text-slate-400' : 'text-slate-900'].join(' ')}>
              {formatKHR(liveSale.totalAmount)}
            </span>
          </div>

          {/* ── Void section ────────────────────────── */}
          {!isVoid && !voidDone && (
            <div className="px-4 pt-4 pb-6">
              {!confirmVoid ? (
                /* Step 1 — Void button */
                <button
                  type="button"
                  onClick={() => setConfirmVoid(true)}
                  className="w-full h-11 rounded-xl border border-danger-200 text-danger-600 font-semibold text-[13px] flex items-center justify-center gap-2 active:bg-danger-50 transition-colors"
                >
                  <Trash2 size={15} strokeWidth={2} />
                  លុប / Cancel ការលក់នេះ
                </button>
              ) : (
                /* Step 2 — Confirm */
                <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-danger-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-danger-800">ប្រាកដទេ?</p>
                      <p className="text-[11px] text-danger-600 mt-0.5 leading-relaxed">
                        ការលក់នឹងត្រូវបានលុប ស្តុកត្រូវបានបន្ថែមត្រឡប់
                        {(liveSale.paymentType === 'debt' || liveSale.paymentType === 'partial') && (
                          <> និង បំណុលអតិថិជនត្រូវបានកាត់</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={voiding}
                      onClick={handleVoid}
                      className="flex-1 h-11 rounded-xl bg-danger-600 text-white font-bold text-[13px] disabled:opacity-50 active:bg-danger-700 transition-colors"
                    >
                      {voiding ? 'កំពុងលុប…' : '✓ លុបការលក់'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmVoid(false)}
                      className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] active:bg-slate-50 transition-colors"
                    >
                      បោះបង់
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already void info */}
          {isVoid && (
            <div className="mx-4 mt-3 mb-6 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
              <p className="text-[12px] text-slate-500">❌ ការលក់នេះត្រូវបានលុករួចហើយ</p>
            </div>
          )}
        </div>
      </div>

      {/* Reprint receipt */}
      {showReprint && (
        <ReprintReceipt sale={liveSale} onClose={() => setShowReprint(false)} />
      )}
    </div>
  )
}
