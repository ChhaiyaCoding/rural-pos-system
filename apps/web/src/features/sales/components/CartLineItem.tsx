'use client'

import { useState } from 'react'
import { Trash2, Tag, X } from 'lucide-react'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR, multiplyKHR, toKHR } from '@/lib/money'
import { PRODUCT_EMOJI } from '../mock-products'
import { ProductThumb } from '@/components/ui/ProductThumb'
import { Stepper } from '@/components/ui/Stepper'
import { IconButton } from '@/components/ui/IconButton'
import { cx } from '@/components/ui/cx'
import { useCartChrome } from './cartChrome'
import type { CartItem } from '@/types'
import type { KHR } from '@/types/branded'

/* Quick discount percentages */
const PERCENTS = [5, 10, 15, 20, 50]

export function CartLineItem({ item, className }: { item: CartItem; className?: string | undefined }) {
  const { tone } = useCartChrome()
  const dark = tone === 'dark'
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
    <div className={cx(dark ? 'py-3' : 'rounded-lg bg-surface p-3', className)}>
      <div className="flex items-start gap-3">
        <ProductThumb product={{ ...product, emoji }} size={48} />

        {/* Tapping the row opens the line-discount editor */}
        <button
          type="button"
          onClick={() => setShowDisc(v => !v)}
          aria-expanded={showDisc}
          className={cx(
            'min-w-0 flex-1 rounded-sm text-left',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            dark ? 'focus-visible:outline-accent' : 'focus-visible:outline-ink-900',
          )}
        >
          <span className="flex items-start justify-between gap-2">
            <span className={cx('truncate text-body-sm font-semibold', dark ? 'text-white' : 'text-text')}>
              {product.nameKm}
            </span>
            <span className={cx('shrink-0 text-body-sm font-bold tabular-nums', dark ? 'text-white' : 'text-text')}>
              {formatKHR(net)}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {hasDisc ? (
              <span
                className={cx(
                  'inline-flex h-6 items-center rounded-full px-2 text-caption font-bold tabular-nums',
                  dark ? 'bg-ink-800 text-success-on-dark' : 'bg-success-bg text-success',
                )}
              >
                បញ្ចុះ −{formatKHR(discount)}
              </span>
            ) : (
              <span className={cx('text-meta tabular-nums', dark ? 'text-ink-300' : 'text-text-muted')}>
                {formatKHR(unitPrice)} × {qty}
              </span>
            )}
            {atMax && (
              <span className={cx('text-meta font-semibold', dark ? 'text-accent' : 'text-warn')}>
                នៅសល់ {product.stockQty}
              </span>
            )}
            <span className="sr-only">· បញ្ចុះតម្លៃ</span>
          </span>
        </button>
      </div>

      {/* Stepper + discount + remove */}
      <div className="mt-2 flex items-center justify-between gap-2 pl-[60px]">
        <Stepper
          variant={dark ? 'onDark' : 'neutral'}
          value={qty}
          onDecrement={() => updateQty(product.id, qty - 1)}
          onIncrement={() => updateQty(product.id, qty + 1)}
          disableIncrement={atMax}
          decrementLabel="ដក"
          incrementLabel="បន្ថែម"
        />
        <div className="flex items-center gap-1">
          <IconButton
            aria-label="បញ្ចុះតម្លៃ"
            aria-expanded={showDisc}
            variant={dark ? 'onDark' : 'soft'}
            onClick={() => setShowDisc(v => !v)}
          >
            <Tag size={18} strokeWidth={2.25} className={hasDisc ? (dark ? 'text-success-on-dark' : 'text-success') : undefined} />
          </IconButton>
          <IconButton
            aria-label="លុប"
            variant={dark ? 'onDark' : 'soft'}
            onClick={() => removeFromCart(product.id)}
          >
            <Trash2 size={18} strokeWidth={2.25} className={dark ? 'text-debt-on-dark' : 'text-danger'} />
          </IconButton>
        </div>
      </div>

      {/* Discount editor (expandable) */}
      {showDisc && (
        <div className={cx('mt-3 space-y-2 rounded-md p-2.5', dark ? 'bg-ink-800' : 'bg-bg')}>
          {/* Percent quick buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PERCENTS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPercent(pct)}
                className={cx(
                  'h-12 rounded-sm px-3 text-body-sm font-bold tabular-nums transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2',
                  dark
                    ? 'bg-ink-700 text-white active:bg-ink-900 focus-visible:outline-accent'
                    : 'bg-surface text-text-subtle active:bg-surface-2 focus-visible:outline-ink-900',
                )}
              >
                {pct}%
              </button>
            ))}
            {hasDisc && (
              <button
                type="button"
                onClick={clearDisc}
                className="flex h-12 items-center gap-1 rounded-sm bg-danger-bg px-3 text-body-sm font-bold text-danger active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                <X size={14} strokeWidth={2.5} aria-hidden="true" />
                លុប
              </button>
            )}
          </div>

          {/* Custom KHR input */}
          <div className="flex gap-1.5">
            <div className={cx('flex flex-1 items-center overflow-hidden rounded-sm', dark ? 'bg-ink-700' : 'bg-surface')}>
              <input
                type="number"
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                placeholder="ចំនួន ៛ ផ្ទាល់…"
                aria-label="ចំនួនបញ្ចុះ ៛"
                className={cx(
                  'h-12 min-w-0 flex-1 bg-transparent px-3 text-body font-semibold tabular-nums outline-none',
                  dark ? 'text-white placeholder:text-ink-300' : 'text-text placeholder:text-text-muted',
                )}
              />
              <span className={cx('pr-3 text-meta', dark ? 'text-ink-300' : 'text-text-muted')}>៛</span>
            </div>
            <button
              type="button"
              disabled={!custom || Number(custom) < 0}
              onClick={applyCustom}
              className={cx(
                'h-12 rounded-sm px-4 text-body-sm font-bold transition-colors disabled:opacity-40',
                'focus-visible:outline-2 focus-visible:outline-offset-2',
                dark ? 'bg-accent text-ink-900 focus-visible:outline-white' : 'bg-ink-900 text-white active:bg-ink-800 focus-visible:outline-ink-900',
              )}
            >
              យក
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
