'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Package, Search, PackagePlus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { productMatchesQuery } from '@/lib/search'
import { ProductFormSheet } from '@/features/inventory/components/ProductFormSheet'
import { RestockSheet } from '@/features/inventory/components/RestockSheet'
import { useCategoryStore } from '@/store/category.store'
import type { Product } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

export default function InventoryPage() {
  const [search,    setSearch]    = useState('')
  const [tab,       setTab]       = useState('all')
  const [editing,   setEditing]   = useState<Product | null>(null)
  const [addOpen,   setAddOpen]   = useState(false)
  const [restocking, setRestocking] = useState<Product | null>(null)

  /* Categories from the shared store — labels for display stay complete,
     but filter tabs only show categories that actually have products */
  const categories = useCategoryStore((s) => s.categories)
  const CATEGORY_LABELS = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.label])),
    [categories]
  )

  const products = useLiveQuery(
    () => db.products.where('tenantId').equals(DEMO_TENANT).filter((p) => !p.deletedAt).toArray(),
    []
  ) ?? []

  const lowStockCount = products.filter(
    (p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold
  ).length
  const outCount = products.filter((p) => p.stockQty === 0).length
  const alertCount = lowStockCount + outCount

  /* Per-category product counts → drive which filter tabs are visible */
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of products) m[p.categoryId] = (m[p.categoryId] ?? 0) + 1
    return m
  }, [products])

  /* Tabs: all + low + only categories that actually have products */
  const TABS = useMemo(
    () => [
      { id: 'all', label: 'ទាំងអស់' },
      { id: 'low', label: '⚠️ ស្ដុកតិច' },
      ...categories
        .filter((c) => (categoryCounts[c.id] ?? 0) > 0)
        .map((c) => ({ id: c.id, label: c.label })),
    ],
    [categories, categoryCounts]
  )

  /* If the active category tab becomes empty, fall back to "all" */
  useEffect(() => {
    if (tab !== 'all' && tab !== 'low' && (categoryCounts[tab] ?? 0) === 0) setTab('all')
  }, [categoryCounts, tab])

  const filtered = useMemo(() => {
    const base = products.filter((p) => {
      const isAlert     = p.stockQty === 0 || p.stockQty <= p.lowStockThreshold
      const matchCat    = tab === 'all' ? true
                        : tab === 'low' ? isAlert
                        : p.categoryId === tab
      const matchSearch = productMatchesQuery(p, search)
      return matchCat && matchSearch
    })

    // On low-stock tab: sort by urgency (out first, then by ratio ascending)
    if (tab === 'low') {
      return [...base].sort((a, b) => {
        if (a.stockQty === 0 && b.stockQty !== 0) return -1
        if (b.stockQty === 0 && a.stockQty !== 0) return 1
        const ratioA = a.stockQty / (a.lowStockThreshold || 1)
        const ratioB = b.stockQty / (b.lowStockThreshold || 1)
        return ratioA - ratioB
      })
    }
    return base
  }, [products, tab, search])

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-slate-900">ស្តុកទំនិញ</h1>
          <span className="text-[12px] text-slate-400 font-medium">{products.length} ទំនិញ</span>
        </div>

        {/* Summary chips */}
        {(lowStockCount > 0 || outCount > 0) && (
          <div className="mt-2 flex gap-2">
            {outCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-700 bg-danger-50 border border-danger-100 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />
                អស់ស្តុក {outCount}
              </span>
            )}
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-700 bg-warning-50 border border-warning-100 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                ស្ទើរអស់ {lowStockCount}
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែង ឈ្មោះ · EN · barcode · តម្លៃ…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
          />
        </div>

        {/* Category tabs */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map((t) => {
            const count = t.id === 'all' ? products.length
                        : t.id === 'low' ? alertCount
                        : products.filter((p) => p.categoryId === t.id).length
            const isAlert = t.id === 'low'
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors flex items-center gap-1.5',
                  isActive
                    ? isAlert ? 'bg-warning-500 text-white' : 'bg-primary-600 text-white'
                    : isAlert && alertCount > 0
                      ? 'bg-warning-100 text-warning-700 active:bg-warning-200'
                      : 'bg-slate-100 text-slate-600 active:bg-slate-200',
                ].join(' ')}
              >
                {t.label}
                <span className={[
                  'text-[10px] font-bold tabular-nums',
                  isActive ? 'opacity-80' : isAlert && alertCount > 0 ? 'text-warning-600' : 'text-slate-400',
                ].join(' ')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
            <Package size={32} strokeWidth={1.5} className="text-slate-300" />
          </div>
          <p className="text-[15px] font-semibold text-slate-700">មិនទាន់មានទំនិញ</p>
          <p className="text-[13px] text-slate-400">ចុច + ដើម្បីបន្ថែមទំនិញដំបូង</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-slate-400">រកមិនឃើញ «{search}»</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.map((product) => {
            const isOut   = product.stockQty === 0
            const isLow   = !isOut && product.stockQty <= product.lowStockThreshold
            const isAlert = isOut || isLow
            return (
              <div key={product.id} className="flex items-center gap-2 px-4 py-3">
                {/* Tap row → edit */}
                <button
                  type="button"
                  onClick={() => setEditing(product)}
                  className="flex-1 flex items-center gap-3 min-w-0 text-left active:opacity-70 transition-opacity"
                >
                  {/* Image / Emoji */}
                  <div className={[
                    'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-[24px] overflow-hidden',
                    isOut ? 'bg-danger-50 border border-danger-100'
                    : isLow ? 'bg-warning-50 border border-warning-100'
                    : 'bg-slate-50 border border-slate-100',
                  ].join(' ')}>
                    {product.imageUri ? (
                      <img src={product.imageUri} alt={product.nameKm} className="w-full h-full object-cover" />
                    ) : (
                      product.emoji || '📦'
                    )}
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 truncate">{product.nameKm}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {CATEGORY_LABELS[product.categoryId] ?? product.categoryId}
                      {' · '}{product.unit}
                    </p>
                  </div>

                  {/* Stock info */}
                  <div className="shrink-0 text-right">
                    <p className={[
                      'text-[14px] font-bold tabular-nums',
                      isOut ? 'text-danger-600' : isLow ? 'text-warning-600' : 'text-success-700',
                    ].join(' ')}>
                      {isOut ? 'អស់' : `${product.stockQty} ${product.unit}`}
                    </p>
                    <p className="text-[12px] font-semibold text-slate-700 tabular-nums mt-0.5">
                      {formatKHR(product.sellPrice)}
                    </p>
                    <p className="text-[10px] font-bold text-primary-600 tabular-nums">
                      {formatUSD(product.sellPrice)}
                    </p>
                    {isAlert && (
                      <span className={[
                        'inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5',
                        isOut ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700',
                      ].join(' ')}>
                        {isOut ? '🔴 អស់ស្ដុក' : '⚠️ ស្ទើរអស់'}
                      </span>
                    )}
                  </div>
                </button>

                {/* Quick restock button — only for alert items */}
                {isAlert && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setRestocking(product) }}
                    className={[
                      'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                      isOut
                        ? 'bg-danger-600 text-white active:bg-danger-700'
                        : 'bg-warning-500 text-white active:bg-warning-600',
                    ].join(' ')}
                    aria-label="បន្ថែមស្ដុក"
                  >
                    <PackagePlus size={18} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* FAB — Add product */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center active:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="បន្ថែមទំនិញ"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Add sheet */}
      {addOpen && (
        <ProductFormSheet
          onClose={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      )}

      {/* Edit sheet */}
      {editing && (
        <ProductFormSheet
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {/* Restock sheet */}
      {restocking && (
        <RestockSheet
          product={restocking}
          onClose={() => setRestocking(null)}
          onRestocked={() => setRestocking(null)}
        />
      )}
    </div>
  )
}
