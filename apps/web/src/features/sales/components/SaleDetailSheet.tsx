'use client'

import { useState } from 'react'
import { User, Trash2, AlertTriangle, Printer, CheckCircle2, Clock, ShoppingCart } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { saleService } from '@/services/sale.service'
import { formatKHR } from '@/lib/money'
import { ReprintReceipt } from './ReprintReceipt'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
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
  cash:    { label: 'សាច់ប្រាក់', cls: 'bg-success-bg text-success', dotCls: 'bg-success', emoji: '💵' },
  debt:    { label: 'ជំពាក់',     cls: 'bg-debt-bg text-debt',       dotCls: 'bg-debt',    emoji: '📒' },
  partial: { label: 'បង់ខ្លះ',     cls: 'bg-warn-bg text-warn',       dotCls: 'bg-warn',    emoji: '🔀' },
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
    <>
      <Sheet
        open
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            លម្អិតការលក់
            {isVoid && <Pill variant="danger">លុបហើយ</Pill>}
          </span>
        }
        ariaLabel="លម្អិតការលក់"
        headerActions={
          <Button variant="secondary" icon={<Printer size={18} strokeWidth={2.25} />} onClick={() => setShowReprint(true)}>
            បោះពុម្ព
          </Button>
        }
        bodyClassName="px-0 pb-0"
      >
        <div className={cx(isVoid && 'opacity-60')}>

          {/* Void success banner */}
          {voidDone && (
            <div className="mx-4 mt-2 flex items-center gap-3 rounded-md bg-success-bg px-4 py-3 text-success md:mx-6">
              <CheckCircle2 size={24} className="shrink-0" aria-hidden="true" />
              <div>
                <p className="text-body-sm font-bold">លុបការលក់ជោគជ័យ!</p>
                <p className="text-meta">ស្តុកត្រូវបានបន្ថែមត្រឡប់ + បំណុលត្រូវបានកាត់</p>
              </div>
            </div>
          )}

          {/* Sale meta */}
          <div className="border-b border-line px-4 pb-4 pt-2 md:px-6">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-meta text-text-muted">{dateStr}</p>
                <p className={cx('mt-0.5 text-amount font-bold tabular-nums tracking-tight', isVoid ? 'text-text-muted line-through' : 'text-text')}>
                  {formatKHR(liveSale.totalAmount)}
                </p>
              </div>
              <span className={cx('mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-meta font-bold', pt.cls)}>
                {pt.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1 text-meta font-medium text-text-subtle">
                <Clock size={14} aria-hidden="true" />
                {timeStr}
              </span>
              {customer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1 text-meta font-medium text-text-subtle">
                  <User size={14} aria-hidden="true" />
                  {customer.nameKm}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1 text-meta font-medium text-text-subtle">
                <ShoppingCart size={14} aria-hidden="true" />
                {items.length} មុខ
              </span>
            </div>

            {liveSale.paymentType === 'partial' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-success-bg px-3 py-2.5 text-success">
                  <p className="text-caption font-bold">ទូទាត់ហើយ</p>
                  <p className="text-body font-bold tabular-nums">
                    {formatKHR(liveSale.paidAmount)}
                  </p>
                </div>
                <div className="rounded-md bg-debt-bg px-3 py-2.5 text-debt">
                  <p className="text-caption font-bold">នៅជំពាក់</p>
                  <p className="text-body font-bold tabular-nums">
                    {formatKHR(debtAmount > 0 ? debtAmount : 0 as KHR)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="px-4 py-3 md:px-6">
            <p className="mb-1 text-meta font-semibold text-text-subtle">
              បញ្ជីទំនិញ
            </p>
            <div className="divide-y divide-line">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-text">{item.nameKm}</p>
                    <p className="mt-0.5 text-meta tabular-nums text-text-muted">
                      {formatKHR(item.unitPrice)} × {item.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-body-sm font-bold tabular-nums text-text">
                    {formatKHR(item.subtotal)}
                  </p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-meta text-text-muted">គ្មានទំនិញ</p>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mx-4 flex items-center justify-between rounded-md bg-surface-2 px-4 py-3 md:mx-6">
            <span className="text-body-sm font-bold text-text-subtle">សរុប</span>
            <span className={cx('text-title font-bold tabular-nums', isVoid ? 'text-text-muted line-through' : 'text-text')}>
              {formatKHR(liveSale.totalAmount)}
            </span>
          </div>

          {/* ── Void section ────────────────────────── */}
          {!isVoid && !voidDone && (
            <div className="px-4 pb-6 pt-4 md:px-6">
              {!confirmVoid ? (
                /* Step 1 — Void button */
                <Button
                  variant="dangerSoft"
                  fullWidth
                  onClick={() => setConfirmVoid(true)}
                  icon={<Trash2 size={18} strokeWidth={2.25} />}
                >
                  លុប / Cancel ការលក់នេះ
                </Button>
              ) : (
                /* Step 2 — Confirm */
                <div className="space-y-3 rounded-lg bg-danger-bg p-4">
                  <div className="flex items-start gap-3 text-danger">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-body-sm font-bold">ប្រាកដទេ?</p>
                      <p className="mt-0.5 text-meta">
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
                      className="h-12 flex-1 rounded-md bg-danger text-body-sm font-bold text-white transition-[filter] active:brightness-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                    >
                      {voiding ? 'កំពុងលុប…' : '✓ លុបការលក់'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmVoid(false)}
                      className="h-12 flex-1 rounded-md bg-surface text-body-sm font-semibold text-text transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
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
            <div className="mx-4 mb-6 mt-3 rounded-md bg-surface-2 px-4 py-3 text-center md:mx-6">
              <p className="text-meta text-text-subtle">ការលក់នេះត្រូវបានលុបរួចហើយ</p>
            </div>
          )}
        </div>
      </Sheet>

      {/* Reprint receipt */}
      {showReprint && (
        <ReprintReceipt sale={liveSale} onClose={() => setShowReprint(false)} />
      )}
    </>
  )
}
