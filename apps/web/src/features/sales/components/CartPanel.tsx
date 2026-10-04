'use client'

import { ShoppingCart, Banknote, NotebookPen, SplitSquareHorizontal, PauseCircle, Trash2 } from 'lucide-react'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR } from '@/lib/money'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { MoneyText } from '@/components/ui/MoneyText'
import { cx } from '@/components/ui/cx'
import { CartLineItem } from './CartLineItem'
import { useCartChrome } from './cartChrome'

interface CartPanelProps {
  /** Called when user taps Cash, Debt, or Partial */
  onPay: (type: 'cash' | 'debt' | 'partial') => void
  /** Called when user holds (parks) the current cart as a draft */
  onHold: () => void
  className?: string | undefined
}

export function CartPanel({ onPay, onHold, className }: CartPanelProps) {
  const { tone, header } = useCartChrome()
  const dark = tone === 'dark'

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
  const lines    = cart.length

  /* ── Empty state ───────────────────────────────────────────── */
  if (count === 0) {
    return (
      <div className={cx('flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center', className)}>
        <div
          className={cx(
            'flex h-20 w-20 items-center justify-center rounded-xl',
            dark ? 'bg-ink-800 text-ink-300' : 'bg-surface text-nav-off',
          )}
          aria-hidden="true"
        >
          <ShoppingCart size={34} strokeWidth={1.75} />
        </div>
        <div>
          <p className={cx('text-body font-bold', dark ? 'text-white' : 'text-text')}>រទេះនៅទទេ</p>
          <p className={cx('mt-1 text-meta', dark ? 'text-ink-300' : 'text-text-muted')}>
            ជ្រើសរើសទំនិញ ដើម្បីចាប់ផ្តើមការលក់
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Cart header (iPad sidebar; the phone sheet provides its own) ── */}
      {header && (
        <div className={cx('flex shrink-0 items-center gap-2 px-5 pb-3 pt-5', className)}>
          <div className="min-w-0 flex-1">
            <p className={cx('text-title-sm font-bold', dark ? 'text-white' : 'text-text')}>រទេះ</p>
            <p className={cx('text-meta tabular-nums', dark ? 'text-ink-300' : 'text-text-muted')}>
              {lines} មុខ · {count} ឯកតា
            </p>
          </div>
          <IconButton aria-label="ផ្អាកវិក្កយបត្រ" variant={dark ? 'onDark' : 'soft'} onClick={onHold}>
            <PauseCircle size={20} strokeWidth={2.25} />
          </IconButton>
          <IconButton aria-label="សម្អាតរទេះ" variant={dark ? 'onDark' : 'soft'} onClick={clearCart}>
            <Trash2 size={20} strokeWidth={2.25} className={dark ? 'text-debt-on-dark' : 'text-danger'} />
          </IconButton>
        </div>
      )}

      {/* ── Line items (scrollable) ──────────────────────────── */}
      <div
        className={cx(
          'min-h-0 flex-1 overflow-y-auto',
          dark ? 'divide-y divide-ink-800 px-5' : 'space-y-2 px-4 pb-3 pt-1',
        )}
      >
        {cart.map((item) => (
          <CartLineItem key={item.product.id} item={item} />
        ))}

        {/* Phone: hold sits under the list (iPad has it in the header) */}
        {!header && (
          <Button variant="secondary" fullWidth icon={<PauseCircle size={18} strokeWidth={2.25} />} onClick={onHold}>
            ផ្អាកវិក្កយបត្រ
          </Button>
        )}
      </div>

      {/* ── Checkout panel ───────────────────────────────────── */}
      <div
        className={cx(
          'shrink-0 bg-ink-900 px-5 pt-5 text-white pb-[max(20px,env(safe-area-inset-bottom))]',
          dark ? 'border-t border-ink-800' : 'rounded-t-2xl',
        )}
      >
        {/* Summary */}
        <div className="space-y-1.5 pb-4">
          <div className="flex items-center justify-between text-meta">
            <span className="text-ink-300">ចំនួនទំនិញ</span>
            <span className="font-semibold tabular-nums text-white">{lines} មុខ · {count} ឯកតា</span>
          </div>
          {discount > 0 && (
            <>
              <div className="flex items-center justify-between text-meta">
                <span className="text-ink-300">តម្លៃដើម</span>
                <span className="font-semibold tabular-nums text-ink-300 line-through">{formatKHR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-meta">
                <span className="font-semibold text-success-on-dark">បញ្ចុះតម្លៃ</span>
                <span className="font-bold tabular-nums text-success-on-dark">−{formatKHR(discount)}</span>
              </div>
            </>
          )}
          <div className="flex items-end justify-between gap-3 border-t border-dashed border-ink-700 pt-3">
            <span className="mb-1 text-body-sm font-semibold text-ink-300">សរុបទឹកប្រាក់</span>
            <MoneyText amount={total} size="xl" tone="onDark" align="right" />
          </div>
        </div>

        {/* Debt / partial */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="onDark"
            size="lg"
            icon={<NotebookPen size={18} strokeWidth={2.25} />}
            onClick={() => onPay('debt')}
          >
            ជំពាក់
          </Button>
          <Button
            variant="onDark"
            size="lg"
            icon={<SplitSquareHorizontal size={18} strokeWidth={2.25} />}
            onClick={() => onPay('partial')}
          >
            បង់ខ្លះ
          </Button>
        </div>

        {/* Primary CTA — Cash */}
        <Button
          variant="primary"
          size="xl"
          fullWidth
          className="mt-2.5 md:h-[66px]"
          onClick={() => onPay('cash')}
        >
          <span className="flex flex-1 items-center gap-2 text-left">
            <Banknote size={22} strokeWidth={2.25} aria-hidden="true" />
            ទូទាត់សាច់ប្រាក់
          </span>
          <span className="font-bold tabular-nums">{formatKHR(total)}</span>
        </Button>
      </div>
    </>
  )
}
