'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Trash2, Camera, ChevronDown, ChevronUp, ScanLine, CheckCircle2, AlertCircle, History } from 'lucide-react'
import { productService } from '@/services/product.service'
import { db } from '@/db'
import { toKHR } from '@/lib/money'
import { BarcodeScanMini } from './BarcodeScanMini'
import { StockHistorySheet } from './StockHistorySheet'
import type { Product } from '@/types'
import type { TenantId, ProductId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

const EMOJIS = [
  '🍚','🍜','🍞','🧂','🥚','🫙','🍺','🥤','💧','🥛',
  '🍬','🪥','🧻','🧼','🍶','🥩','🐟','🧅','🥬','🌾',
  '🫚','☕','🧃','🍭','📦','🧁','🍌','🍊','🥜','🫘',
  '💊','🩹','🧰','🔧','👕','👖','👟','🛒','🎯','🏷️',
]

const UNITS = [
  'ថង់','ដប','ចំណិត','ហ្គីឡូ','ផ្ទាំង','ជំហរ',
  'កំប៉ុង','ហ្វូង','ក្រឡាប់','ដំ','កញ្ចប់','លីត្រ',
  'ម៉ែត្រ','បំណែក','ជោ','មុខ','គ្រាប់','ប្រអប់',
]

const CATEGORIES = [
  { id: 'food',         label: 'ម្ហូបអាហារ' },
  { id: 'drink',        label: 'ភេសជ្ជៈ' },
  { id: 'household',    label: 'គ្រឿងប្រើប្រាស់' },
  { id: 'medicine',     label: 'ថ្នាំ/សុខភាព' },
  { id: 'construction', label: 'គ្រឿងសំណង់' },
  { id: 'clothing',     label: 'សំលៀកបំពាក់' },
  { id: 'other',        label: 'ផ្សេងៗ' },
]

interface ProductFormSheetProps {
  product?: Product
  onClose: () => void
  onSaved: () => void
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Uniform square canvas with WHITE background so every product looks
        // consistent — transparent PNGs blend (no more black), white-bg photos
        // match the app, and the product is centred with breathing room.
        const SIZE = 320          // square output (px)
        const PAD  = 0.84         // product fills 84% → whitespace around it
        const canvas = document.createElement('canvas')
        canvas.width  = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')!

        // 1. Fill white (fixes transparent PNG turning black under JPEG)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, SIZE, SIZE)

        // 2. Contain-fit the product, centred, with padding
        const box   = SIZE * PAD
        const scale = Math.min(box / img.width, box / img.height)
        const w = img.width  * scale
        const h = img.height * scale
        const x = (SIZE - w) / 2
        const y = (SIZE - h) / 2
        ctx.drawImage(img, x, y, w, h)

        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function ProductFormSheet({ product, onClose, onSaved }: ProductFormSheetProps) {
  const isEdit = !!product

  const [imageUri,      setImageUri]      = useState(product?.imageUri   ?? '')
  const [showEmoji,     setShowEmoji]     = useState(!product?.imageUri)
  const [emoji,         setEmoji]         = useState(product?.emoji      ?? '📦')
  const [name,          setName]          = useState(product?.nameKm     ?? '')
  const [nameEn,        setNameEn]        = useState(product?.nameEn     ?? '')
  const [categoryId,    setCategoryId]    = useState(
    CATEGORIES.some((c) => c.id === product?.categoryId) ? (product?.categoryId ?? 'food') : '__custom_cat__'
  )
  const [customCategory, setCustomCategory] = useState(
    !CATEGORIES.some((c) => c.id === product?.categoryId) ? (product?.categoryId ?? '') : ''
  )
  const [unit,       setUnit]       = useState(
    UNITS.includes(product?.unit ?? 'ថង់') ? (product?.unit ?? 'ថង់') : '__custom__'
  )
  const [customUnit, setCustomUnit] = useState(
    !UNITS.includes(product?.unit ?? 'ថង់') ? (product?.unit ?? '') : ''
  )
  const [sellPrice,  setSellPrice]  = useState(product?.sellPrice  ? String(product.sellPrice)  : '')
  const [stockQty,   setStockQty]   = useState(product?.stockQty   != null ? String(product.stockQty) : '')
  const [lowStock,   setLowStock]   = useState(product?.lowStockThreshold != null ? String(product.lowStockThreshold) : '5')
  const [costPrice,  setCostPrice]  = useState(product?.costPrice  ? String(product.costPrice)  : '')
  const [barcode,    setBarcode]    = useState(product?.barcode ?? '')
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'ok' | 'dup'>('idle')
  const [showScanner, setShowScanner] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Barcode duplicate check ───────────────────────── */
  useEffect(() => {
    const code = barcode.trim()
    if (!code) { setBarcodeStatus('idle'); return }
    let cancelled = false
    db.products
      .where('barcode').equals(code)
      .filter(p => !p.deletedAt && p.id !== product?.id)
      .first()
      .then(existing => {
        if (cancelled) return
        setBarcodeStatus(existing ? 'dup' : 'ok')
      })
      .catch(() => { if (!cancelled) setBarcodeStatus('idle') })
    return () => { cancelled = true }
  }, [barcode, product?.id])

  const effectiveUnit     = unit === '__custom__'     ? customUnit     : unit
  const effectiveCatId   = categoryId === '__custom_cat__' ? customCategory : categoryId
  const effectiveBarcode = barcode.trim() || null
  const canSave = name.trim() && sellPrice && Number(sellPrice) > 0 && effectiveUnit.trim() && effectiveCatId.trim() && barcodeStatus !== 'dup'

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const uri = await compressImage(file)
    setImageUri(uri)
    setShowEmoji(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const sell = toKHR(Number(sellPrice))
      const cost = costPrice && Number(costPrice) > 0
        ? toKHR(Number(costPrice))
        : toKHR(Math.round(Number(sellPrice) * 0.7))
      const qty  = Math.max(0, Number(stockQty) || 0)
      const low  = Math.max(0, Number(lowStock)  || 5)

      if (isEdit && product) {
        await productService.update(product.id as ProductId, {
          nameKm:            name.trim(),
          nameEn:            nameEn.trim(),
          emoji,
          imageUri:          imageUri || null,
          barcode:           effectiveBarcode,
          categoryId:        effectiveCatId.trim(),
          unit:              effectiveUnit.trim(),
          sellPrice:         sell,
          costPrice:         cost,
          stockQty:          qty,
          lowStockThreshold: low,
        })
      } else {
        await productService.create({
          tenantId:          DEMO_TENANT,
          nameKm:            name.trim(),
          nameEn:            nameEn.trim(),
          emoji,
          imageUri:          imageUri || null,
          barcode:           effectiveBarcode,
          categoryId:        effectiveCatId.trim(),
          unit:              effectiveUnit.trim(),
          sellPrice:         sell,
          costPrice:         cost,
          stockQty:          qty,
          lowStockThreshold: low,
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit || !product || deleting || !confirmDel) return
    setDeleting(true)
    try {
      await productService.softDelete(product.id as ProductId)
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col shadow-pop animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <span className="text-[16px] font-bold text-slate-900">
            {isEdit ? 'កែប្រែទំនិញ' : 'បន្ថែមទំនិញថ្មី'}
          </span>
          <div className="flex items-center gap-2">
            {/* Stock history — edit mode only */}
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="min-h-0 min-w-0 h-9 px-3 flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 text-[12px] font-bold active:bg-primary-100 transition-colors"
                aria-label="ប្រវត្តិស្តុក"
              >
                <History size={14} strokeWidth={2.25} />
                ប្រវត្តិ
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-0 min-w-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-5">

          {/* Image / Emoji section */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-2">រូបទំនិញ</p>

            <div className="flex items-start gap-3">
              {/* Preview */}
              <div className="shrink-0 w-[72px] h-[72px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {imageUri ? (
                  <img src={imageUri} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[36px] leading-none">{emoji}</span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 flex items-center justify-center gap-2 active:bg-slate-50 transition-colors"
                >
                  <Camera size={15} className="text-slate-400" />
                  {imageUri ? 'ប្តូររូបភាព' : 'ជ្រើសរូប / ថតរូប'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />

                <button
                  type="button"
                  onClick={() => setShowEmoji(!showEmoji)}
                  className={[
                    'w-full h-9 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors',
                    showEmoji
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-600 active:bg-slate-50',
                  ].join(' ')}
                >
                  <span>😊</span>
                  ជ្រើស Emoji
                  {showEmoji ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {imageUri && (
                  <button
                    type="button"
                    onClick={() => { setImageUri(''); setShowEmoji(true) }}
                    className="w-full h-8 rounded-xl text-[12px] font-medium text-danger-600 active:bg-danger-50 transition-colors"
                  >
                    ✕ លុបរូប
                  </button>
                )}
              </div>
            </div>

            {/* Emoji grid */}
            {showEmoji && (
              <div className="mt-3 flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={[
                      'w-10 h-10 rounded-xl text-[22px] flex items-center justify-center border transition-colors',
                      emoji === e && !imageUri
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 active:bg-slate-50',
                    ].join(' ')}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ឈ្មោះទំនិញ *</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ឧ. អង្ករ ២គីឡូ"
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-[15px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
            />
          </div>

          {/* English name (optional) */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">
              ឈ្មោះ English <span className="text-slate-300 font-normal">(ស្រេចចិត្ត — ងាយស្វែងរក)</span>
            </p>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Rice 2kg"
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-[15px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
            />
          </div>

          {/* Barcode */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">
              Barcode <span className="text-slate-300 font-normal">(ស្រេចចិត្ត)</span>
            </p>
            <div className="flex gap-2">
              <div className={[
                'flex-1 flex items-center border rounded-xl overflow-hidden transition-colors',
                barcodeStatus === 'ok'  ? 'border-success-400 bg-success-50'
                : barcodeStatus === 'dup' ? 'border-danger-400 bg-danger-50'
                : 'border-slate-200',
              ].join(' ')}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="ឧ. 8851234567890"
                  className="flex-1 h-12 px-4 text-[14px] font-mono text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
                />
                {barcodeStatus === 'ok' && (
                  <CheckCircle2 size={16} className="text-success-500 mr-3 shrink-0" />
                )}
                {barcodeStatus === 'dup' && (
                  <AlertCircle size={16} className="text-danger-500 mr-3 shrink-0" />
                )}
              </div>
              {/* Scan button */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-white active:bg-slate-700 transition-colors"
                aria-label="ស្កែន Barcode"
              >
                <ScanLine size={20} strokeWidth={2.25} />
              </button>
            </div>
            {barcodeStatus === 'dup' && (
              <p className="mt-1 text-[11px] text-danger-600 font-semibold">
                ⚠ Barcode នេះមានស្រាប់ក្នុងទំនិញផ្សេងហើយ
              </p>
            )}
            {barcodeStatus === 'ok' && (
              <p className="mt-1 text-[11px] text-success-600 font-semibold">
                ✓ Barcode ល្អ — អាចប្រើបាន
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ប្រភេទ</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategoryId(cat.id); setCustomCategory('') }}
                  className={[
                    'h-9 px-3 rounded-xl border text-[12px] font-semibold transition-colors',
                    categoryId === cat.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-600 active:bg-slate-50',
                  ].join(' ')}
                >
                  {cat.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCategoryId('__custom_cat__')}
                className={[
                  'h-9 px-3 rounded-xl border text-[12px] font-semibold transition-colors',
                  categoryId === '__custom_cat__'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 active:bg-slate-50',
                ].join(' ')}
              >
                ផ្សេង…
              </button>
            </div>
            {categoryId === '__custom_cat__' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="វាយប្រភេទផ្ទាល់…"
                className="mt-2 w-full h-10 rounded-xl border border-slate-200 px-3 text-[14px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500"
              />
            )}
          </div>

          {/* Unit */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ឯកតា</p>
            <div className="flex flex-wrap gap-2">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => { setUnit(u); setCustomUnit('') }}
                  className={[
                    'h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors',
                    unit === u
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-600 active:bg-slate-50',
                  ].join(' ')}
                >
                  {u}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUnit('__custom__')}
                className={[
                  'h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors',
                  unit === '__custom__'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 active:bg-slate-50',
                ].join(' ')}
              >
                ផ្សេង…
              </button>
            </div>
            {unit === '__custom__' && (
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="វាយឯកតាផ្ទាល់…"
                className="mt-2 w-full h-10 rounded-xl border border-slate-200 px-3 text-[14px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500"
              />
            )}
          </div>

          {/* Sell price + Cost price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[12px] font-semibold text-slate-500 mb-1.5">តម្លៃលក់ (រៀល) *</p>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-primary-500">
                <input
                  type="number"
                  inputMode="numeric"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0"
                  className="flex-1 h-12 px-3 text-[16px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
                />
                <span className="pr-3 text-[13px] text-slate-400">៛</span>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ថ្លៃទិញ (ស្រេចចិត្ត)</p>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-primary-500">
                <input
                  type="number"
                  inputMode="numeric"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder={sellPrice ? String(Math.round(Number(sellPrice) * 0.7)) : '0'}
                  className="flex-1 h-12 px-3 text-[16px] font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
                />
                <span className="pr-3 text-[13px] text-slate-400">៛</span>
              </div>
              {/* Profit margin hint */}
              {sellPrice && costPrice && Number(costPrice) > 0 && Number(sellPrice) > 0 && (
                <p className="text-[10px] text-success-600 mt-1 font-semibold">
                  ចំណេញ {Math.round(((Number(sellPrice) - Number(costPrice)) / Number(sellPrice)) * 100)}%
                </p>
              )}
            </div>
          </div>

          {/* Stock qty with +/− stepper */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ចំនួនស្តុក</p>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-primary-500 bg-white">
              <button
                type="button"
                onClick={() => setStockQty(v => String(Math.max(0, (Number(v) || 0) - 1)))}
                className="min-h-0 min-w-0 w-12 h-12 flex items-center justify-center text-slate-500 active:bg-slate-100 text-[22px] font-light border-r border-slate-200 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="0"
                className="flex-1 h-12 text-center text-[18px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setStockQty(v => String((Number(v) || 0) + 1))}
                className="min-h-0 min-w-0 w-12 h-12 flex items-center justify-center text-slate-500 active:bg-slate-100 text-[22px] font-light border-l border-slate-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Low stock threshold */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ជូនដំណឹងនៅ (ឯកតា)</p>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-warning-400 bg-white">
              <button
                type="button"
                onClick={() => setLowStock(v => String(Math.max(1, (Number(v) || 5) - 1)))}
                className="min-h-0 min-w-0 w-12 h-12 flex items-center justify-center text-slate-500 active:bg-slate-100 text-[22px] font-light border-r border-slate-200 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
                placeholder="5"
                className="flex-1 h-12 text-center text-[16px] font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setLowStock(v => String((Number(v) || 5) + 1))}
                className="min-h-0 min-w-0 w-12 h-12 flex items-center justify-center text-slate-500 active:bg-slate-100 text-[22px] font-light border-l border-slate-200 transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-warning-600 mt-1">⚠️ ស្ដុកធ្លាក់ចុះ ≤ {lowStock || '5'} — ជូនដំណឹង</p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="w-full h-14 rounded-xl bg-primary-600 text-white font-bold text-[16px] disabled:opacity-50 disabled:pointer-events-none active:bg-primary-700 transition-colors"
          >
            {saving ? 'កំពុងរក្សាទុក…' : isEdit ? 'រក្សាទុកការកែ' : 'បន្ថែមទំនិញ'}
          </button>

          {/* Delete — 2-step confirm */}
          {isEdit && !confirmDel && (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="w-full h-10 rounded-xl border border-danger-200 text-danger-600 font-semibold text-[13px] flex items-center justify-center gap-2 active:bg-danger-50 transition-colors"
            >
              <Trash2 size={14} strokeWidth={2} />
              លុបទំនិញ
            </button>
          )}

          {isEdit && confirmDel && (
            <div className="rounded-xl bg-danger-50 border border-danger-100 px-3 py-3 space-y-2">
              <p className="text-center text-[12px] font-semibold text-danger-700">
                ⚠️ ប្រាកដទេ? ទំនិញនឹងបាត់ចេញពី List!
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex-1 h-10 rounded-xl bg-danger-600 text-white font-bold text-[13px] disabled:opacity-50 active:bg-danger-700 transition-colors"
                >
                  {deleting ? '…' : 'បាទ/ចាស លុប'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] active:bg-slate-50 transition-colors"
                >
                  បោះបង់
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barcode scanner mini modal */}
      {showScanner && (
        <BarcodeScanMini
          onDetected={(code) => { setBarcode(code); setShowScanner(false) }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Stock history sheet */}
      {showHistory && product && (
        <StockHistorySheet
          product={product}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
