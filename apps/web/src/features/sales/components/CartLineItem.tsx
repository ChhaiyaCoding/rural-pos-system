'use client'

import { useState } from 'react'
import { Trash2, Minus, Plus, Tag, X } from 'lucide-react'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR, multiplyKHR, toKHR } from '@/lib/money'
import { PRODUCT_EMOJI } from '../mock-products'
import type { CartItem } from '@/types'
import type { KHR } from '@/types/branded'

/* Quick discount percentages */
const PERCENTS = [5, 10, 15, 20, 50]

export function CartLineItem({ item }: { item: CartItem }) {
  const updateQty        = useSaleStore((s) => s.updateQty)
  const removeFromCart   = useSaleStore((s) => s.removeFromCart)
  const setLineDiscount  = useSaleStore((s) => s.setLineDiscount)

  const [showDisc, setShowDisc] = useState(false)
  const [custom,   setCustom]   = useState('')

  const { product, qty, unitPrice, lineDiscount } = item
  const gross    = multiplyKHR(unitPrice, qty)
  const discount = Math.min(lineDiscount ?? 0, gross) as KHR
  const net      = Math.max(0, gross - discount) as KHR
  const hasDisc  = discount > 0
  const emoji    = PRODUCT_EMOJI[product.id] ?? product.emoji ?? '📦'
  const atMax    = qty >= product.stockQty

  const applyPercent = (pct: number) => {
    const amt = Math.round(gross * (pct / 100)) as KHR
    setLineDiscount(product.id, amt)
    setCustom('')
  }
  const applyCustom = () => {
    const amt = Math.max(0, Number(custom) || 0) as KHR
    setLineDiscount(product.id, amt)
  }
  const clearDisc = () => {
    setLineDiscount(product.id, toKHR(0))
    setCustom('')
    setShowDisc(false)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex gap-3">
        {/* Emoji thumbnail */}
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
          {product.imageUri
            ? <img src={product.imageUri} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg leading-none select-none">{emoji}</span>}
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0">
          {/* Top: name + subtotal */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">
              {product.nameKm}
            </p>
            <div className="shrink-0 text-right">
              {hasDisc ? (
                <>
                  <span className="text-[11px] font-medium text-slate-400 line-through tabular-nums block leading-none">
                    {formatKHR(gross)}
                  </span>
                  <span className="text-[14px] font-bold text-success-700 tabular-nums tracking-tight">
                    {formatKHR(net)}
                  </span>
                </>
              ) : (
                <span className="text-[14px] font-bold text-slate-900 tabular-nums tracking-tight">
                  {formatKHR(gross)}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
            {formatKHR(unitPrice)} / {product.unit}
            {atMax && (
              <span className="ml-1.5 text-warning-700 font-medium">· នៅសល់ {product.stockQty}</span>
            )}
          </p>

          {/* Bottom: stepper + discount + remove */}
          <div className="flex items-center justify-between mt-2 gap-2">
            {/* Quantity stepper */}
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => updateQty(product.id, qty - 1)}
                className="min-h-0 min-w-0 w-9 h-9 flex items-center justify-center text-slate-600 active:bg-slate-100 transition-colors"
                aria-label="ដក"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>
              <span className="w-9 h-9 flex items-center justify-center text-[14px] font-bold text-slate-900 tabular-nums border-x border-slate-200 select-none">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => updateQty(product.id, qty + 1)}
                disabled={atMax}
                className="min-h-0 min-w-0 w-9 h-9 flex items-center justify-center text-primary-600 active:bg-primary-50 transition-colors disabled:text-slate-300 disabled:active:bg-transparent disabled:pointer-events-none"
                aria-label="បន្ថែម"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Discount toggle */}
              <button
                type="button"
                onClick={() => setShowDisc(v => !v)}
                className={[
                  'min-h-0 min-w-0 h-9 px-2.5 flex items-center gap-1 rounded-lg text-[12px] font-semibold transition-colors',
                  hasDisc
                    ? 'bg-success-100 text-success-700 active:bg-success-200'
                    : showDisc
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-400 active:bg-slate-100',
                ].join(' ')}
                aria-label="បញ្ចុះតម្លៃ"
              >
                <Tag size={14} strokeWidth={2.25} />
                {hasDisc ? `−${formatKHR(discount)}` : 'បញ្ចុះ'}
              </button>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeFromCart(product.id)}
                className="min-h-0 min-w-0 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 active:text-danger-600 active:bg-danger-50 transition-colors"
                aria-label="លុប"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Discount editor (expandable) */}
          {showDisc && (
            <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5 space-y-2">
              {/* Percent quick buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PERCENTS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPercent(pct)}
                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-[12px] font-bold text-slate-600 active:bg-primary-50 active:border-primary-300 active:text-primary-700 transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
                {hasDisc && (
                  <button
                    type="button"
                    onClick={clearDisc}
                    className="h-8 px-2.5 rounded-lg bg-danger-50 border border-danger-200 text-[12px] font-bold text-danger-600 active:bg-danger-100 transition-colors flex items-center gap-1"
                  >
                    <X size={12} strokeWidth={2.5} />
                    លុប
                  </button>
                )}
              </div>

              {/* Custom KHR input */}
              <div className="flex gap-1.5">
                <div className="flex-1 flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                    placeholder="ចំនួន ៛ ផ្ទាល់…"
                    className="flex-1 h-9 px-3 text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none tabular-nums"
                  />
                  <span className="pr-2.5 text-[12px] text-slate-400">៛</span>
                </div>
                <button
                  type="button"
                  disabled={!custom || Number(custom) < 0}
                  onClick={applyCustom}
                  className="h-9 px-3.5 rounded-lg bg-primary-600 text-white text-[12px] font-bold disabled:opacity-40 active:bg-primary-700 transition-colors"
                >
                  យក
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
