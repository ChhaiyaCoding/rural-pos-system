'use client'

import { useMemo } from 'react'
import { X, History, ShoppingCart, PackagePlus, RotateCcw, Settings2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { stockMovementService } from '@/services/stockMovement.service'
import { formatDateTimeKm } from '@/lib/date'
import type { Product, StockMovement, StockMovementType } from '@/types'
import type { ProductId } from '@/types/branded'

interface Props {
  product: Product
  onClose: () => void
}

const TYPE_CONFIG: Record<
  StockMovementType,
  { label: string; icon: typeof ShoppingCart; iconCls: string; bgCls: string }
> = {
  sale:        { label: 'លក់ចេញ',     icon: ShoppingCart, iconCls: 'text-danger-600',  bgCls: 'bg-danger-100'  },
  restock:     { label: 'បន្ថែមស្តុក', icon: PackagePlus,  iconCls: 'text-success-600', bgCls: 'bg-success-100' },
  void_return: { label: 'លុបការលក់',  icon: RotateCcw,    iconCls: 'text-primary-600', bgCls: 'bg-primary-100' },
  adjustment:  { label: 'កែសម្រួល',   icon: Settings2,    iconCls: 'text-warning-600', bgCls: 'bg-warning-100' },
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
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <History size={17} strokeWidth={2.25} className="text-primary-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-slate-900 truncate leading-tight">{product.nameKm}</p>
              <p className="text-[11px] text-slate-400 leading-tight">ប្រវត្តិស្តុក</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="shrink-0 grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
          <div className="px-3 py-3 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">ស្តុកឥឡូវ</p>
            <p className="text-[16px] font-extrabold text-slate-900 tabular-nums">
              {product.stockQty}<span className="text-[10px] font-medium text-slate-400 ml-0.5">{product.unit}</span>
            </p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[9px] font-bold text-success-500 uppercase mb-0.5">បន្ថែម</p>
            <p className="text-[16px] font-extrabold text-success-700 tabular-nums">+{totalIn}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[9px] font-bold text-danger-500 uppercase mb-0.5">ចេញ</p>
            <p className="text-[16px] font-extrabold text-danger-600 tabular-nums">−{totalOut}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <p className="text-[13px] text-slate-400">កំពុងផ្ទុក…</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <History size={28} strokeWidth={1.5} className="text-slate-300" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">មិនទាន់មានចលនាស្តុក</p>
              <p className="text-[12px] text-slate-400">ការលក់ ឬ បន្ថែមស្តុក នឹងបង្ហាញនៅទីនេះ</p>
            </div>
          ) : (
            grouped.map(([dateKey, items]) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="sticky top-0 z-10 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-[12px] font-bold text-slate-600">{dateLabel(dateKey)}</span>
                </div>

                {/* Movements */}
                <div className="divide-y divide-slate-50">
                  {items.map((m) => {
                    const cfg  = TYPE_CONFIG[m.type]
                    const Icon = cfg.icon
                    const t    = new Date(m.createdAt).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
                    const isUp = m.delta > 0
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bgCls}`}>
                          <Icon size={16} className={cfg.iconCls} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{cfg.label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                            {t} · {m.qtyBefore} → {m.qtyAfter} {product.unit}
                          </p>
                        </div>
                        <p className={[
                          'text-[15px] font-extrabold tabular-nums shrink-0',
                          isUp ? 'text-success-600' : 'text-danger-600',
                        ].join(' ')}>
                          {isUp ? '+' : '−'}{Math.abs(m.delta)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
