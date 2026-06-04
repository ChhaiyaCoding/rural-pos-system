'use client'

import { useSaleStore } from '@/store/sale.store'
import { formatKHR, formatUSD } from '@/lib/money'
import type { Product } from '@/types'

interface ProductCardProps {
  product:   Product
  index:     number
  onFly?:    (startX: number, startY: number, emoji: string, imageUri: string | null) => void
}

export function ProductCard({ product, onFly }: ProductCardProps) {
  const addToCart = useSaleStore((s) => s.addToCart)
  /* qty of THIS product already in the cart — drives the selected state */
  const inCart = useSaleStore(
    (s) => s.cart.find((i) => i.product.id === product.id)?.qty ?? 0
  )

  const isOutOfStock = product.stockQty === 0
  const isLowStock   = !isOutOfStock && product.stockQty <= product.lowStockThreshold
  const isSelected   = inCart > 0
  const emoji        = product.emoji || '📦'

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isOutOfStock) return
    addToCart(product)
    // Fly animation — pass center of the image container
    if (onFly) {
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = rect.left + rect.width  / 2
      const cy = rect.top  + rect.height * 0.28   // roughly center of image area
      onFly(cx, cy, emoji, product.imageUri ?? null)
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => handleClick(e)}
      disabled={isOutOfStock}
      className={[
        'group relative flex flex-col text-left select-none touch-manipulation',
        'rounded-xl bg-white p-2 border',
        'transition-[border-color,box-shadow,transform] duration-100',
        'active:scale-[0.97]',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500/15 shadow-card'
          : 'border-slate-200 shadow-xs active:border-slate-300',
        'disabled:opacity-55 disabled:pointer-events-none disabled:grayscale disabled:shadow-none',
      ].join(' ')}
    >
      {/* Product image container */}
      <div
        className={[
          'relative w-full h-[72px] rounded-lg flex items-center justify-center mb-2 overflow-hidden',
          'ring-1 ring-inset transition-colors',
          product.imageUri
            ? (isSelected ? 'bg-white ring-primary-200' : 'bg-white ring-slate-100')
            : (isSelected ? 'bg-primary-50 ring-primary-100' : 'bg-slate-50 ring-slate-100'),
        ].join(' ')}
      >
        {product.imageUri ? (
          <img
            src={product.imageUri}
            alt={product.nameKm}
            className="w-full h-full object-cover transition-transform duration-100 group-active:scale-95"
          />
        ) : (
          <span className="text-[34px] leading-none select-none transition-transform duration-100 group-active:scale-95">
            {emoji}
          </span>
        )}

        {/* In-cart quantity badge */}
        {isSelected && (
          <span className="absolute top-1 right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-primary-600 text-white text-[12px] font-bold flex items-center justify-center tabular-nums shadow-sm ring-2 ring-white">
            {inCart}
          </span>
        )}

        {/* Low-stock badge */}
        {isLowStock && (
          <span className="absolute bottom-1 left-1 flex items-center gap-1 text-[9px] font-bold text-warning-700 bg-warning-100 rounded-full pl-1 pr-1.5 py-0.5 leading-none">
            <span className="w-1 h-1 rounded-full bg-warning-500" />
            នៅ {product.stockQty}
          </span>
        )}

        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/65">
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 leading-none shadow-xs">
              អស់ស្តុក
            </span>
          </span>
        )}
      </div>

      {/* Khmer product name — fixed 2 lines for a tidy grid */}
      <p className="text-[12px] font-medium text-slate-600 leading-[1.35] line-clamp-2 min-h-[2.7em]">
        {product.nameKm}
      </p>

      {/* Price + unit (unit wraps below if tight — never truncates mid-word) */}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[16px] font-extrabold text-slate-900 tabular-nums tracking-tight whitespace-nowrap">
          {formatKHR(product.sellPrice)}
        </span>
        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">/{product.unit}</span>
      </div>

      {/* USD equivalent */}
      <span className="text-[11px] font-bold text-primary-600 tabular-nums whitespace-nowrap">
        {formatUSD(product.sellPrice)}
      </span>
    </button>
  )
}
