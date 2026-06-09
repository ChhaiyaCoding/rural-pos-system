'use client'

import { ShoppingCart, Banknote, NotebookPen, Plus, SplitSquareHorizontal, PauseCircle } from 'lucide-react'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR, formatUSD } from '@/lib/money'
import { CartLineItem } from './CartLineItem'

interface CartPanelProps {
  /** Called when user taps Cash, Debt, or Partial */
  onPay: (type: 'cash' | 'debt' | 'partial') => void
  /** Called when user holds (parks) the current cart as a draft */
  onHold: () => void
}

export function CartPanel({ onPay, onHold }: CartPanelProps) {
  const cart              = useSaleStore((s) => s.cart)
  const cartTotal         = useSaleStore((s) => s.cartTotal)
  const cartSubtotal      = useSaleStore((s) => s.cartSubtotal)
  const cartDiscountTotal = useSaleStore((s) => s.cartDiscountTotal)
  const cartCount         = useSaleStore((s) => s.cartCount)
  const clearCart         = useSaleStore((s) => s.clearCart)

  const total    = cartTotal()
  const subtotal = cartSubtotal()
  const discount = cartDiscountTotal()
  const count    = cartCount()

  /* ── Empty state ───────────────────────────────────────────── */
  if (count === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="relative">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-100 text-slate-300">
            <ShoppingCart size={34} strokeWidth={1.75} />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white shadow-md ring-2 ring-white">
            <Plus size={16} strokeWidth={3} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-slate-700">រទេះនៅទទេ</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            ជ្រើសរើសទំនិញ ដើម្បីចាប់ផ្តើមការលក់
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Cart header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-13 border-b border-slate-200 shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-slate-900">រទេះទំនិញ</span>
          <span className="text-[13px] font-medium text-slate-400 tabular-nums">({count})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onHold}
            className="min-h-0 min-w-0 flex items-center gap-1 text-[12px] font-semibold text-warning-700 active:text-warning-800 px-2 py-1.5"
          >
            <PauseCircle size={14} strokeWidth={2.25} />
            ផ្អាក
          </button>
          <button
            type="button"
            onClick={clearCart}
            className="min-h-0 min-w-0 text-[12px] font-semibold text-slate-500 active:text-danger-600 px-2 py-1.5"
          >
            សម្អាត
          </button>
        </div>
      </div>

      {/* ── Line items (scrollable) ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
        {cart.map((item) => (
          <CartLineItem key={item.product.id} item={item} />
        ))}
      </div>

      {/* ── Sticky checkout area ─────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-slate-200 shadow-panel px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">

        {/* Summary */}
        <div className="space-y-1.5 pb-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500">ចំនួនទំនិញ</span>
            <span className="font-semibold text-slate-700 tabular-nums">{count} មុខ</span>
          </div>
          {discount > 0 && (
            <>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">តម្លៃដើម</span>
                <span className="font-medium text-slate-500 tabular-nums line-through">{formatKHR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-success-600 font-medium">បញ្ចុះតម្លៃ</span>
                <span className="font-bold text-success-700 tabular-nums">−{formatKHR(discount)}</span>
              </div>
            </>
          )}
          <div className="border-t border-dashed border-slate-200" />
          <div className="flex items-end justify-between pt-1">
            <span className="text-[13px] font-medium text-slate-500 mb-1">សរុបទឹកប្រាក់</span>
            <div className="text-right">
              <span className="block text-[30px] font-extrabold text-slate-900 tabular-nums leading-none tracking-tight">
                {formatKHR(total)}
              </span>
              <span className="block text-[13px] font-bold text-primary-600 tabular-nums mt-0.5">
                {formatUSD(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary CTA — Cash (charge) */}
        <button
          type="button"
          onClick={() => onPay('cash')}
          className={[
            'w-full h-14 rounded-xl px-4 mb-2.5',
            'bg-success-600 text-white active:bg-success-700',
            'shadow-lg shadow-success-600/25',
            'flex items-center justify-between',
            'transition-all active:scale-[0.99]',
          ].join(' ')}
        >
          <span className="flex items-center gap-2 font-bold text-[15px]">
            <Banknote size={20} strokeWidth={2.25} />
            ទូទាត់សាច់ប្រាក់
          </span>
          <span className="font-extrabold text-[16px] tabular-nums tracking-tight">
            {formatKHR(total)}
          </span>
        </button>

        {/* Secondary — Debt / pay later */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPay('debt')}
            className={[
              'flex-1 h-12 rounded-xl',
              'bg-white text-slate-700 border border-slate-300',
              'flex items-center justify-center gap-2 font-semibold text-[13px]',
              'active:bg-slate-50 transition-colors',
            ].join(' ')}
          >
            <NotebookPen size={17} strokeWidth={2.25} />
            ជំពាក់
          </button>

          {/* Partial — pay some now, rest as debt */}
          <button
            type="button"
            onClick={() => onPay('partial')}
            className={[
              'flex-1 h-12 rounded-xl',
              'bg-warning-50 text-warning-800 border border-warning-200',
              'flex items-center justify-center gap-1.5 font-semibold text-[13px]',
              'active:bg-warning-100 transition-colors',
            ].join(' ')}
          >
            <SplitSquareHorizontal size={17} strokeWidth={2.25} />
            ផ្នែក
          </button>
        </div>
      </div>
    </>
  )
}
