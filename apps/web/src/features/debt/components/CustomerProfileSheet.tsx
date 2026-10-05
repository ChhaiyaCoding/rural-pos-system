'use client'

import { useMemo } from 'react'
import {
  Phone, MapPin, FileText, Pencil, Receipt, NotebookText, ChevronRight,
  Banknote, NotebookPen, SplitSquareHorizontal, type LucideIcon,
} from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { StatTile } from '@/components/ui/StatTile'
import { LetterAvatar } from '@/components/ui/LetterAvatar'
import { MoneyText } from '@/components/ui/MoneyText'
import { Pill, type PillVariant } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { formatDateKm, formatDateTimeKm } from '@/lib/date'
import type { Customer, Sale } from '@/types'
import type { TenantId, KHR } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  customer:      Customer
  onClose:       () => void
  onEdit:        (c: Customer) => void
  onViewLedger:  (c: Customer) => void
  onOpenReceipt: (s: Sale) => void
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

  return (
    <Sheet
      open
      onClose={onClose}
      tone="bg"
      title="ព័ត៌មានអតិថិជន"
      headerActions={
        <Button variant="secondary" icon={<Pencil size={16} strokeWidth={2.25} />} onClick={() => onEdit(live)}>
          កែ
        </Button>
      }
    >
      <div className="space-y-4 pb-2">

        {/* Profile card */}
        <div className="flex items-start gap-4 rounded-lg bg-surface p-4">
          <LetterAvatar name={live.nameKm} imageUri={live.imageUri} status={hasDebt ? 'overdue' : 'neutral'} size={60} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-title-sm font-bold text-text">{live.nameKm}</p>
            {live.phone && (
              <p className="mt-1 flex items-center gap-1.5 text-meta text-text-muted">
                <Phone size={14} className="shrink-0" aria-hidden="true" />{live.phone}
              </p>
            )}
            {live.address && (
              <p className="mt-1 flex items-start gap-1.5 text-meta text-text-muted">
                <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{live.address}
              </p>
            )}
            {live.note && (
              <p className="mt-1 flex items-start gap-1.5 text-meta text-text-muted">
                <FileText size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{live.note}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="ការទិញសរុប" value={formatKHR(totalPurchases)} sub={formatUSD(totalPurchases)} />
          <StatTile label="វិក្កយបត្រ" value={invoiceCount} sub="ដង" />
          <StatTile label="ទិញចុងក្រោយ" value={<span className="text-body-sm">{lastPurchase ? formatDateKm(lastPurchase) : '—'}</span>} />
        </div>

        {/* Debt summary */}
        <section>
          <h3 className="mb-2 px-1 text-body-sm font-bold text-text">សង្ខេបបំណុល</h3>
          <div className="overflow-hidden rounded-lg bg-surface">
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="px-3 py-3 text-center">
                <p className="text-meta text-text-muted">ជំពាក់សរុប</p>
                <p className="text-body-sm font-bold tabular-nums text-text">{formatKHR(totalCharged)}</p>
              </div>
              <div className="px-3 py-3 text-center">
                <p className="text-meta text-text-muted">បានសង</p>
                <p className="text-body-sm font-bold tabular-nums text-success">{formatKHR(totalPaid)}</p>
              </div>
            </div>
            <div className={cx('flex items-center justify-between border-t border-line px-4 py-3', hasDebt ? 'bg-debt-bg' : 'bg-success-bg')}>
              <span className={cx('text-body-sm font-bold', hasDebt ? 'text-debt' : 'text-success')}>នៅសល់</span>
              <MoneyText amount={remaining} tone={hasDebt ? 'debt' : 'success'} align="right" />
            </div>
          </div>
          <Button
            variant="secondary"
            fullWidth
            className="mt-2.5"
            icon={<NotebookText size={18} strokeWidth={2.25} />}
            onClick={() => onViewLedger(live)}
          >
            មើលសៀវភៅបំណុល
          </Button>
        </section>

        {/* Purchase history */}
        <section>
          <h3 className="mb-2 px-1 text-body-sm font-bold text-text">ប្រវត្តិ​ការ​ទិញ</h3>
          {sortedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Receipt size={28} strokeWidth={1.5} className="text-nav-off" aria-hidden="true" />
              <p className="text-meta text-text-muted">មិន​ទាន់​មាន​ការ​ទិញ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSales.map((sale) => {
                const pt = PAY_UI[sale.paymentType]
                const Icon = pt.icon
                return (
                  <button
                    key={sale.id}
                    type="button"
                    onClick={() => onOpenReceipt(sale)}
                    className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                  >
                    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-md', pt.tile)} aria-hidden="true">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-bold tabular-nums text-text">
                        #{sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase()}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-meta text-text-muted">{formatDateTimeKm(sale.createdAt)}</span>
                        <Pill variant={pt.pill}>{pt.label}</Pill>
                      </span>
                    </span>
                    <MoneyText amount={sale.totalAmount} align="right" />
                    <ChevronRight size={18} className="shrink-0 text-nav-off" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Sheet>
  )
}

/** Display only: payment-type tile + pill (matches the Receipts screen). */
const PAY_UI: Record<Sale['paymentType'], { label: string; pill: PillVariant; tile: string; icon: LucideIcon }> = {
  cash:    { label: 'សាច់ប្រាក់', pill: 'success', tile: 'bg-success-bg text-success', icon: Banknote },
  debt:    { label: 'ជំពាក់',     pill: 'debt',    tile: 'bg-debt-bg text-debt',       icon: NotebookPen },
  partial: { label: 'បង់ខ្លះ',     pill: 'warn',    tile: 'bg-warn-bg text-warn',       icon: SplitSquareHorizontal },
}
