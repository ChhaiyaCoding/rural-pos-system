'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Package, PackagePlus, Truck } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { productMatchesQuery } from '@/lib/search'
import { ProductFormSheet } from '@/features/inventory/components/ProductFormSheet'
import { RestockSheet } from '@/features/inventory/components/RestockSheet'
import { useCategoryStore } from '@/store/category.store'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { iconButtonClass } from '@/components/ui/IconButton'
import { ProductThumb } from '@/components/ui/ProductThumb'
import { cx } from '@/components/ui/cx'
import type { KHR } from '@/types'
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
      { id: 'low', label: '⚠️ ស្តុកតិច' },
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

  /* ── Display only ───────────────────────────────────────────── */
  const stockValue = products.reduce((sum, p) => sum + (p.costPrice as number) * p.stockQty, 0) as KHR
  const categoryTabs = TABS.filter((t) => t.id !== 'all' && t.id !== 'low')

  return (
    <div className="mx-auto w-full max-w-3xl md:px-6">

      <PageHeader
        title="ស្តុកទំនិញ"
        subtitle={`${products.length} ទំនិញ · តម្លៃស្តុក ${formatKHR(stockValue)}`}
        className="md:px-0"
        actions={
          <>
            <Link href="/suppliers" aria-label="អ្នកផ្គត់ផ្គង់" className={iconButtonClass('light')}>
              <Truck size={20} strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <Button variant="dark" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => setAddOpen(true)}>
              ទំនិញថ្មី
            </Button>
          </>
        }
      />

      <div className="space-y-3 px-4 md:px-0">
        {/* Filter tiles — ទាំងអស់ / ស្តុកតិច use the existing filters */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTab('all')}
            aria-pressed={tab === 'all'}
            className={cx(
              'flex flex-col items-start rounded-lg bg-ink-900 p-3.5 text-left text-white',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
              tab === 'all' && 'ring-2 ring-accent',
            )}
          >
            <span className="text-amount font-bold tabular-nums">{products.length}</span>
            <span className="text-meta font-semibold text-ink-300">ទាំងអស់</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('low')}
            aria-pressed={tab === 'low'}
            className={cx(
              'flex flex-col items-start rounded-lg bg-warn-bg p-3.5 text-left text-warn',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn',
              tab === 'low' && 'ring-2 ring-warn',
            )}
          >
            <span className="text-amount font-bold tabular-nums">{alertCount}</span>
            <span className="text-meta font-semibold">ស្តុកតិច</span>
          </button>
          <div className="flex flex-col items-start rounded-lg bg-danger-bg p-3.5 text-danger">
            <span className="text-amount font-bold tabular-nums">{outCount}</span>
            <span className="text-meta font-semibold">អស់ស្តុក</span>
          </div>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ស្វែង ឈ្មោះ · EN · barcode · តម្លៃ…"
        />

        {/* Category pills */}
        {categoryTabs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categoryTabs.map((t) => {
              const isActive = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(isActive ? 'all' : t.id)}
                  aria-pressed={isActive}
                  className={cx(
                    'flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-body-sm font-semibold transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                    isActive ? 'bg-ink-900 text-white' : 'bg-surface text-text-subtle active:bg-surface-2',
                  )}
                >
                  {t.label}
                  <span className="text-caption font-bold tabular-nums opacity-70">{categoryCounts[t.id] ?? 0}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Product list */}
      <div className="px-4 pb-6 pt-3 md:px-0">
        {products.length === 0 ? (
          <EmptyState
            icon={<Package size={30} strokeWidth={1.5} />}
            title="មិនទាន់មានទំនិញ"
            description="ចុច + ដើម្បីបន្ថែមទំនិញដំបូង"
          />
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-meta text-text-muted">រកមិនឃើញ «{search}»</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((product) => {
              const isOut   = product.stockQty === 0
              const isLow   = !isOut && product.stockQty <= product.lowStockThreshold
              const isAlert = isOut || isLow
              const full    = Math.max(1, product.lowStockThreshold * 3)
              const ratio   = Math.min(1, product.stockQty / full)
              return (
                <div key={product.id} className="flex items-center gap-2 rounded-lg bg-surface py-3 pl-3 pr-2">
                  {/* Tap row → edit */}
                  <button
                    type="button"
                    onClick={() => setEditing(product)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                  >
                    <ProductThumb product={product} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold text-text">{product.nameKm}</span>
                      <span
                        className={cx(
                          'block truncate text-meta font-semibold tabular-nums',
                          isOut ? 'text-danger' : isLow ? 'text-warn' : 'text-success',
                        )}
                      >
                        {isOut ? 'អស់ស្តុក' : `សល់ ${product.stockQty} ${product.unit}`}
                        <span className="font-normal text-text-muted"> · {CATEGORY_LABELS[product.categoryId] ?? product.categoryId}</span>
                      </span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg" aria-hidden="true">
                        <span
                          className={cx('block h-full rounded-full', isOut ? 'bg-danger' : isLow ? 'bg-accent' : 'bg-success')}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block text-body-sm font-bold text-text">{formatKHR(product.sellPrice)}</span>
                      <span className="block text-caption text-text-muted">/{product.unit} · {formatUSD(product.sellPrice)}</span>
                    </span>
                  </button>

                  {/* Restock — accent when low / out */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setRestocking(product) }}
                    className={cx(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-md transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                      isAlert ? 'bg-accent text-ink-900 active:brightness-95' : 'bg-surface-2 text-text-subtle active:bg-line',
                    )}
                    aria-label={`បន្ថែមស្តុក ${product.nameKm}`}
                  >
                    <PackagePlus size={20} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
