'use client'

import { useState, useEffect } from 'react'
import { Package, CheckCircle2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { ProductThumb } from '@/components/ui/ProductThumb'
import { cx } from '@/components/ui/cx'
import { inventoryService } from '@/services/inventory.service'
import { formatKHR } from '@/lib/money'
import type { Product } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId
const QUICK_QTYS  = [5, 10, 20, 50, 100]

interface Props {
  product: Product
  onClose: () => void
  onRestocked?: (newQty: number) => void
}

export function RestockSheet({ product, onClose, onRestocked }: Props) {
  const [input,   setInput]   = useState('')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState<number | null>(null)   // stores delta

  const delta    = Math.max(0, Number(input) || 0)
  const newQty   = product.stockQty + delta
  const canSave  = delta > 0 && !saving

  const isOut = product.stockQty === 0
  const isLow = !isOut && product.stockQty <= product.lowStockThreshold

  /* Auto-close after success */
  useEffect(() => {
    if (success === null) return
    const t = setTimeout(() => {
      onRestocked?.(newQty)
      onClose()
    }, 1400)
    return () => clearTimeout(t)
  }, [success])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await inventoryService.adjustStock(DEMO_TENANT, product.id, delta, note)
      if (res.ok) {
        setSuccess(delta)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="បន្ថែមស្តុក"
      footer={
        success === null ? (
          <Button
            variant="primary"
            size="xl"
            fullWidth
            disabled={!canSave}
            onClick={handleSave}
            icon={saving ? undefined : <Package size={20} strokeWidth={2.25} />}
          >
            {saving
              ? 'កំពុងរក្សាទុក…'
              : delta > 0
                ? `បន្ថែម +${delta} ${product.unit}`
                : 'វាយចំនួន'}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 pt-1">

        {/* Product info row */}
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
          <ProductThumb product={product} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-bold text-text">{product.nameKm}</p>
            <p className="mt-0.5 text-meta text-text-muted">
              {formatKHR(product.sellPrice)} · {product.unit}
            </p>
          </div>
          {/* Current stock */}
          <div className="shrink-0 text-right">
            <p className="text-caption text-text-muted">ស្តុកបច្ចុប្បន្ន</p>
            <p className={cx('text-title-sm font-bold tabular-nums', isOut ? 'text-danger' : isLow ? 'text-warn' : 'text-success')}>
              {product.stockQty}
              <span className="ml-1 text-caption font-semibold opacity-80">{product.unit}</span>
            </p>
          </div>
        </div>

        {/* Success */}
        {success !== null ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6" role="status">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success" aria-hidden="true">
              <CheckCircle2 size={36} strokeWidth={2} />
            </div>
            <p className="text-body font-bold text-success">
              បន្ថែម +{success} {product.unit} ជោគជ័យ!
            </p>
            <p className="text-meta tabular-nums text-text-muted">
              ស្តុកថ្មី: <span className="font-bold text-text">{product.stockQty + success} {product.unit}</span>
            </p>
          </div>
        ) : (
          <>
            {/* Amount input */}
            <div className="flex min-h-[64px] items-center rounded-[18px] bg-bg px-4 focus-within:ring-2 focus-within:ring-ink-900/20">
              <div className="flex min-w-0 flex-1 flex-col py-1.5">
                <label htmlFor="restock-qty" className="text-caption font-semibold text-text-subtle">ចំនួនបន្ថែម</label>
                <input
                  id="restock-qty"
                  type="number"
                  inputMode="numeric"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="0"
                  autoFocus
                  min={1}
                  className="w-full bg-transparent text-title font-bold tabular-nums text-text outline-none placeholder:text-text-muted"
                />
              </div>
              <span className="text-body-sm font-semibold text-text-subtle">{product.unit}</span>
            </div>

            {/* Quick amount chips */}
            <div>
              <p className="mb-2 text-meta text-text-muted">ចំនួនរហ័ស</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QTYS.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setInput(String(qty))}
                    aria-pressed={input === String(qty)}
                    className={cx(
                      'h-12 rounded-sm px-4 text-body-sm font-bold tabular-nums transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                      input === String(qty) ? 'bg-ink-900 text-white' : 'bg-bg text-text-subtle active:bg-line',
                    )}
                  >
                    +{qty}
                  </button>
                ))}
              </div>
            </div>

            {/* Note — where the stock came from, supplier, etc. */}
            <div className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-bg px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
              <label htmlFor="restock-note" className="text-caption font-semibold text-text-subtle">កំណត់ចំណាំ (ស្រេចចិត្ត)</label>
              <input
                id="restock-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ឧ. ទិញពី ផ្សារដើមថ្កូវ · 250,000៛"
                className="w-full bg-transparent text-body text-text outline-none placeholder:text-text-muted"
              />
            </div>

            {/* Stock preview */}
            {delta > 0 && (
              <div className="flex items-center justify-between rounded-md bg-success-bg px-4 py-3">
                <span className="text-body-sm font-semibold text-success">ស្តុកបន្ទាប់ពីបន្ថែម</span>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-body-sm font-semibold text-text-muted line-through">{product.stockQty}</span>
                  <span className="text-text-muted" aria-hidden="true">→</span>
                  <span className="text-title-sm font-bold text-success">
                    {newQty}
                    <span className="ml-1 text-caption font-semibold opacity-80">{product.unit}</span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
