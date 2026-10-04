'use client'

import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR } from '@/lib/money'
import { ProductThumb } from '@/components/ui/ProductThumb'
import { Stepper } from '@/components/ui/Stepper'
import { cx } from '@/components/ui/cx'
import type { Product } from '@/types'

interface ProductCardProps {
  product:   Product
  index:     number
  onFly?:    (startX: number, startY: number, emoji: string, imageUri: string | null) => void
  className?: string | undefined
}

export function ProductCard({ product, onFly, className }: ProductCardProps) {
  const addToCart = useSaleStore((s) => s.addToCart)
  const updateQty = useSaleStore((s) => s.updateQty)
  /* qty of THIS product already in the cart — drives the selected state */
  const inCart = useSaleStore(
    (s) => s.cart.find((i) => i.product.id === product.id)?.qty ?? 0
  )
  const cardRef = useRef<HTMLDivElement>(null)

  const isOutOfStock = product.stockQty === 0
  const isLowStock   = !isOutOfStock && product.stockQty <= product.lowStockThreshold
  const isSelected   = inCart > 0
  const emoji        = product.emoji || '📦'

  const handleAdd = () => {
    if (isOutOfStock) return
    addToCart(product)
    // Fly animation — from roughly the center of the image area of the card
    if (onFly && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width  / 2
      const cy = rect.top  + rect.height * 0.28
      onFly(cx, cy, emoji, product.imageUri ?? null)
    }
  }

  return (
    <div
      ref={cardRef}
      className={cx(
        'relative flex flex-col rounded-[22px] bg-surface p-2 transition-shadow',
        isSelected && 'ring-2 ring-accent',
        isOutOfStock && 'opacity-55',
        className,
      )}
    >
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOutOfStock}
        className={cx(
          'group flex flex-col rounded-md text-left select-none touch-manipulation',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
          'disabled:pointer-events-none',
        )}
      >
        <span className="relative block">
          <ProductThumb
            product={product}
            size={84}
            fluid
            className="transition-transform duration-100 group-active:scale-[0.97]"
          />
          {/* Stock pill */}
          <span
            className={cx(
              'absolute left-1.5 top-1.5 inline-flex h-6 items-center rounded-full px-2 text-caption font-bold tabular-nums',
              isOutOfStock ? 'bg-danger text-white'
                : isLowStock ? 'bg-warn text-white'
                : 'bg-white/85 text-text-subtle',
            )}
          >
            {isOutOfStock ? 'អស់ស្តុក' : isLowStock ? `ជិតអស់ · ${product.stockQty}` : `សល់ ${product.stockQty}`}
          </span>
        </span>

        <span className="mt-2 truncate px-1 text-body-sm font-semibold text-text">
          {product.nameKm}
        </span>
        <span className="flex items-baseline gap-1 px-1">
          <span className="whitespace-nowrap text-label-lg font-bold tabular-nums text-text">
            {formatKHR(product.sellPrice)}
          </span>
          <span className="truncate text-meta text-text-muted">/{product.unit}</span>
        </span>
      </button>

      <div className="mt-2">
        {isSelected ? (
          <Stepper
            variant="accent"
            fullWidth
            value={inCart}
            onDecrement={() => updateQty(product.id, inCart - 1)}
            onIncrement={handleAdd}
            disableIncrement={inCart >= product.stockQty}
            decrementLabel={`ដក ${product.nameKm}`}
            incrementLabel={`បន្ថែម ${product.nameKm}`}
          />
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            aria-label={`បន្ថែម ${product.nameKm}`}
            className={cx(
              'flex h-12 w-full items-center justify-center gap-1.5 rounded-md bg-bg',
              'text-body-sm font-bold text-ink-900 transition-colors active:bg-line',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
              'disabled:pointer-events-none',
            )}
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
            បន្ថែម
          </button>
        )}
      </div>
    </div>
  )
}
