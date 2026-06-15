'use client'

import { useState, useEffect } from 'react'
import { X, Package, CheckCircle2 } from 'lucide-react'
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl shadow-pop animate-sheet-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package size={16} strokeWidth={2.25} className="text-primary-500" />
            <span className="text-[15px] font-bold text-slate-900">បន្ថែមស្តុក</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────── */}
        <div className="px-4 pt-4 pb-6 space-y-4">

          {/* Product info row */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[24px] overflow-hidden">
              {product.imageUri
                ? <img src={product.imageUri} alt="" className="w-full h-full object-cover" />
                : (product.emoji || '📦')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-slate-900 truncate">{product.nameKm}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {formatKHR(product.sellPrice)} · {product.unit}
              </p>
            </div>
            {/* Current stock badge */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-slate-400 mb-0.5">ស្តុកបច្ចុប្បន្ន</p>
              <p className={[
                'text-[18px] font-extrabold tabular-nums',
                isOut ? 'text-danger-600' : isLow ? 'text-warning-600' : 'text-success-700',
              ].join(' ')}>
                {product.stockQty}
                <span className="text-[11px] font-semibold ml-1 opacity-70">{product.unit}</span>
              </p>
            </div>
          </div>

          {/* Success overlay */}
          {success !== null ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-16 h-16 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                <CheckCircle2 size={36} strokeWidth={2} />
              </div>
              <p className="text-[15px] font-bold text-success-800">
                បន្ថែម +{success} {product.unit} ជោគជ័យ!
              </p>
              <p className="text-[13px] text-slate-500 tabular-nums">
                ស្តុកថ្មី: <span className="font-bold text-slate-800">{product.stockQty + success} {product.unit}</span>
              </p>
            </div>
          ) : (
            <>
              {/* Amount input */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-2">ចំនួនបន្ថែម</p>
                <div className="flex items-center gap-2 border border-primary-300 rounded-xl bg-primary-50 overflow-hidden">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="0"
                    autoFocus
                    min={1}
                    className="flex-1 h-13 px-4 py-3.5 text-[22px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none tabular-nums"
                  />
                  <span className="pr-4 text-[14px] font-semibold text-primary-500">{product.unit}</span>
                </div>
              </div>

              {/* Quick amount chips */}
              <div>
                <p className="text-[11px] text-slate-400 mb-2">ចំនួនរហ័ស</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QTYS.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setInput(String(qty))}
                      className={[
                        'h-9 px-4 rounded-xl text-[13px] font-bold transition-colors border',
                        input === String(qty)
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 active:bg-slate-100',
                      ].join(' ')}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note — where the stock came from, supplier, etc. */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-2">កំណត់ចំណាំ (ស្រេចចិត្ត)</p>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ឧ. ទិញពី ផ្សារដើមថ្កូវ · 250,000៛"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                />
              </div>

              {/* Stock preview */}
              {delta > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-success-50 border border-success-200 px-4 py-3">
                  <span className="text-[13px] font-semibold text-success-700">ស្តុកបន្ទាប់ពីបន្ថែម</span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className={[
                      'text-[14px] font-semibold line-through',
                      isOut ? 'text-danger-400' : isLow ? 'text-warning-400' : 'text-slate-400',
                    ].join(' ')}>
                      {product.stockQty}
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="text-[18px] font-extrabold text-success-700">
                      {newQty}
                      <span className="text-[11px] font-semibold ml-1 opacity-70">{product.unit}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className="w-full h-13 py-3.5 rounded-2xl bg-success-600 text-white font-bold text-[15px] disabled:opacity-40 active:bg-success-700 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="opacity-70">កំពុងរក្សាទុក…</span>
                ) : (
                  <>
                    <Package size={18} strokeWidth={2.25} />
                    {delta > 0
                      ? `បន្ថែម +${delta} ${product.unit}`
                      : 'វាយចំនួន'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
