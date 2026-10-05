'use client'

import { useMemo } from 'react'
import { History, ShoppingCart, PackagePlus, RotateCcw, Settings2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { cx } from '@/components/ui/cx'
import { useLiveQuery } from 'dexie-react-hooks'
import { stockMovementService } from '@/services/stockMovement.service'
import { formatDateTimeKm } from '@/lib/date'
import type { Product, StockMovement, StockMovementType } from '@/types'
import type { ProductId } from '@/types/branded'

interface Props {
  product: Product
  onClose: () => void
}

const TYPE_CONFIG: Record<StockMovementType, { label: string; icon: typeof ShoppingCart }> = {
  sale:        { label: 'លក់ចេញ',     icon: ShoppingCart },
  restock:     { label: 'បន្ថែមស្តុក', icon: PackagePlus  },
  void_return: { label: 'លុបការលក់',  icon: RotateCcw    },
  adjustment:  { label: 'កែសម្រួល',   icon: Settings2    },
}

function dateLabel(iso: string): string {
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
  const key = iso.slice(0, 10)
  if (key === today)     return 'ថ្ងៃនេះ'
  if (key === yesterday) return 'ម្សិលមិញ'
  return new Date(iso).toLocaleDateString('km-KH', { day: 'numeric', month: 'short' })
}

export function StockHistorySheet({ product, onClose }: Props) {
  const movements = useLiveQuery(
    () => stockMovementService.getByProduct(product.id as ProductId, 100),
    [product.id]
  ) ?? []

  const isLoading = movements === undefined

  /* Group by date */
  const grouped = useMemo(() => {
    const map = new Map<string, StockMovement[]>()
    for (const m of movements) {
      const key = m.createdAt.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [movements])

  /* Totals */
  const totalIn  = movements.filter(m => m.delta > 0).reduce((s, m) => s + m.delta, 0)
  const totalOut = movements.filter(m => m.delta < 0).reduce((s, m) => s + Math.abs(m.delta), 0)

  return (
    <Sheet open onClose={onClose} title={product.nameKm} subtitle="ប្រវត្តិស្តុក" bodyClassName="px-0 pb-4">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3 md:px-6">
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="text-meta text-text-muted">ស្តុកឥឡូវ</p>
          <p className="text-title-sm font-bold tabular-nums text-text">
            {product.stockQty}<span className="ml-1 text-caption font-semibold text-text-muted">{product.unit}</span>
          </p>
        </div>
        <div className="rounded-lg bg-success-bg p-3">
          <p className="text-meta text-success">បន្ថែម</p>
          <p className="text-title-sm font-bold tabular-nums text-success">+{totalIn}</p>
        </div>
        <div className="rounded-lg bg-debt-bg p-3">
          <p className="text-meta text-debt">ចេញ</p>
          <p className="text-title-sm font-bold tabular-nums text-debt">−{totalOut}</p>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <p className="py-16 text-center text-meta text-text-muted">កំពុងផ្ទុក…</p>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<History size={28} strokeWidth={1.5} />}
          title="មិនទាន់មានចលនាស្តុក"
          description="ការលក់ ឬ បន្ថែមស្តុក នឹងបង្ហាញនៅទីនេះ"
        />
      ) : (
        grouped.map(([dateKey, items]) => (
          <section key={dateKey}>
            {/* Date header */}
            <h3 className="sticky top-0 z-10 border-y border-line bg-surface-2 px-4 py-2 text-meta font-bold text-text-subtle md:px-6">
              {dateLabel(dateKey)}
            </h3>

            {/* Movements */}
            <div className="divide-y divide-line">
              {items.map((m) => {
                const cfg  = TYPE_CONFIG[m.type]
                const Icon = cfg.icon
                const t    = new Date(m.createdAt).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
                const isUp = m.delta > 0
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 md:px-6">
                    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-md', TYPE_TILE[m.type])} aria-hidden="true">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-semibold text-text">{cfg.label}</p>
                      <p className="mt-0.5 text-meta tabular-nums text-text-muted">
                        {t} · {m.qtyBefore} → {m.qtyAfter} {product.unit}
                      </p>
                      {m.note && (
                        <p className="mt-0.5 truncate text-meta text-text-subtle">📝 {m.note}</p>
                      )}
                    </div>
                    <p className={cx('shrink-0 text-body font-bold tabular-nums', isUp ? 'text-success' : 'text-debt')}>
                      {isUp ? '+' : '−'}{Math.abs(m.delta)}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </Sheet>
  )
}

/** Display only: tinted tile per movement type. */
const TYPE_TILE: Record<StockMovementType, string> = {
  sale:        'bg-debt-bg text-debt',
  restock:     'bg-success-bg text-success',
  void_return: 'bg-tint-4 text-tint-4-ink',
  adjustment:  'bg-warn-bg text-warn',
}
