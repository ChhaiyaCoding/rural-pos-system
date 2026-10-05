'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X, Trash2, Camera, ChevronDown, ChevronUp, ScanLine, CheckCircle2, AlertCircle, AlertTriangle, History, Pencil, Plus, Check,
  Image as ImageIcon,
} from 'lucide-react'
import { productService } from '@/services/product.service'
import { db } from '@/db'
import { toKHR, formatKHR, formatUSD, getExchangeRate } from '@/lib/money'
import { useUnitStore } from '@/store/unit.store'
import { useCategoryStore } from '@/store/category.store'
import { BarcodeScanMini } from './BarcodeScanMini'
import { StockHistorySheet } from './StockHistorySheet'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ProductThumb } from '@/components/ui/ProductThumb'
import { Pill } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import type { Product } from '@/types'
import type { TenantId, ProductId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

const EMOJIS = [
  '🍚','🍜','🍞','🧂','🥚','🫙','🍺','🥤','💧','🥛',
  '🍬','🪥','🧻','🧼','🍶','🥩','🐟','🧅','🥬','🌾',
  '🫚','☕','🧃','🍭','📦','🧁','🍌','🍊','🥜','🫘',
  '💊','🩹','🧰','🔧','👕','👖','👟','🛒','🎯','🏷️',
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
  /* Categories — managed & persisted in a dedicated store */
  const categories      = useCategoryStore((s) => s.categories)
  const addCategory     = useCategoryStore((s) => s.addCategory)
  const renameCategory  = useCategoryStore((s) => s.renameCategory)
  const removeCategory  = useCategoryStore((s) => s.removeCategory)
  const ensureCategory  = useCategoryStore((s) => s.ensureCategory)

  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 'food')

  /* Category management UI state */
  const [manageCats,    setManageCats]    = useState(false)
  const [newCat,        setNewCat]        = useState('')
  const [editingCat,    setEditingCat]    = useState<string | null>(null)
  const [editCatValue,  setEditCatValue]  = useState('')

  /* Units — managed & persisted in a dedicated store */
  const units       = useUnitStore((s) => s.units)
  const addUnit     = useUnitStore((s) => s.addUnit)
  const renameUnit  = useUnitStore((s) => s.renameUnit)
  const removeUnit  = useUnitStore((s) => s.removeUnit)

  const [unit, setUnit] = useState(product?.unit ?? units[0] ?? 'ថង់')

  /* Unit management UI state */
  const [manageUnits,   setManageUnits]   = useState(false)
  const [newUnit,       setNewUnit]       = useState('')
  const [editingUnit,   setEditingUnit]   = useState<string | null>(null)
  const [editUnitValue, setEditUnitValue] = useState('')
  const [sellPrice,  setSellPrice]  = useState(product?.sellPrice  ? String(product.sellPrice)  : '')
  const [stockQty,   setStockQty]   = useState(product?.stockQty   != null ? String(product.stockQty) : '')
  const [lowStock,   setLowStock]   = useState(product?.lowStockThreshold != null ? String(product.lowStockThreshold) : '5')
  const [costPrice,  setCostPrice]  = useState(product?.costPrice  ? String(product.costPrice)  : '')
  const [priceCurrency, setPriceCurrency] = useState<'KHR' | 'USD'>('KHR')

  /* Toggle the price inputs between ៛ and $ — convert current values so they
     stay equivalent (prices are always stored in ៛). */
  const switchPriceCurrency = (cur: 'KHR' | 'USD') => {
    if (cur === priceCurrency) return
    const rate = getExchangeRate()
    const conv = (val: string): string => {
      const n = Number(val)
      if (!val || isNaN(n) || n === 0) return val
      return cur === 'USD' ? String(+(n / rate).toFixed(4)) : String(Math.round(n * rate))
    }
    setSellPrice(conv(sellPrice))
    setCostPrice(conv(costPrice))
    setPriceCurrency(cur)
  }
  const [barcode,    setBarcode]    = useState(product?.barcode ?? '')
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'ok' | 'dup'>('idle')
  const [showScanner, setShowScanner] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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

  const effectiveUnit    = unit.trim()
  const effectiveCatId   = categoryId.trim()
  const effectiveBarcode = barcode.trim() || null
  const canSave = name.trim() && sellPrice && Number(sellPrice) > 0 && effectiveUnit && effectiveCatId && barcodeStatus !== 'dup'

  /* If editing a product whose unit/category isn't in the list, add it so it stays selectable */
  useEffect(() => {
    if (product?.unit && !units.includes(product.unit)) addUnit(product.unit)
    if (product?.categoryId && !categories.some((c) => c.id === product.categoryId)) {
      ensureCategory(product.categoryId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Category management handlers ───────────────────── */
  const handleAddCat = () => {
    const label = newCat.trim()
    if (!label) return
    const id = addCategory(label)
    if (id) setCategoryId(id)
    setNewCat('')
  }
  const startRenameCat = (id: string) => {
    setEditingCat(id)
    setEditCatValue(categories.find((c) => c.id === id)?.label ?? '')
  }
  const commitRenameCat = () => {
    const nv = editCatValue.trim()
    if (nv && editingCat) renameCategory(editingCat, nv)
    setEditingCat(null)
  }
  const handleRemoveCat = (id: string) => {
    const remaining = categories.filter((c) => c.id !== id)
    removeCategory(id)
    if (categoryId === id) setCategoryId(remaining[0]?.id ?? '')
    if (editingCat === id) setEditingCat(null)
  }

  /* ── Unit management handlers ───────────────────────── */
  const handleAddUnit = () => {
    const u = newUnit.trim()
    if (!u) return
    addUnit(u)
    setUnit(u)
    setNewUnit('')
  }
  const startRenameUnit = (u: string) => {
    setEditingUnit(u)
    setEditUnitValue(u)
  }
  const commitRenameUnit = () => {
    const nv = editUnitValue.trim()
    if (nv && editingUnit) {
      renameUnit(editingUnit, nv)
      if (unit === editingUnit) setUnit(nv)
    }
    setEditingUnit(null)
  }
  const handleRemoveUnit = (u: string) => {
    const remaining = units.filter((x) => x !== u)
    removeUnit(u)
    if (unit === u) setUnit(remaining[0] ?? '')
    if (editingUnit === u) setEditingUnit(null)
  }

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
      const rate = getExchangeRate()
      const toRiel = (v: string) =>
        priceCurrency === 'USD' ? Math.round((Number(v) || 0) * rate) : Math.round(Number(v) || 0)
      const sellRiel = toRiel(sellPrice)
      const sell = toKHR(sellRiel)
      const cost = costPrice && Number(costPrice) > 0
        ? toKHR(toRiel(costPrice))
        : toKHR(Math.round(sellRiel * 0.7))
      const qty  = Math.max(0, Number(stockQty) || 0)
      const low  = Math.max(0, Number(lowStock)  || 5)

      if (isEdit && product) {
        await productService.update(product.id as ProductId, {
          nameKm:            name.trim(),
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
    <>
      <Sheet
        open
        onClose={onClose}
        title={isEdit ? 'កែប្រែទំនិញ' : 'បន្ថែមទំនិញថ្មី'}
        footer={
          <div className="flex gap-2">
            {/* Stock history — edit mode only */}
            {isEdit && (
              <Button
                variant="secondary"
                size="lg"
                icon={<History size={20} strokeWidth={2.25} />}
                onClick={() => setShowHistory(true)}
              >
                ស្តុក
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="flex-1"
              disabled={!canSave || saving}
              onClick={handleSave}
              icon={<Check size={20} strokeWidth={2.5} />}
            >
              {saving ? 'កំពុងរក្សាទុក…' : isEdit ? 'រក្សាទុកការកែ' : 'បន្ថែមទំនិញ'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pt-1">

          {/* ── Hero: photo + name / category / barcode / stock status ── */}
          <div className="flex items-center gap-4 rounded-lg bg-ink-900 p-4 text-white">
            <div className="relative shrink-0">
              <ProductThumb
                product={{ id: product?.id ?? ('new' as ProductId), nameKm: name.trim() || '?', emoji, imageUri: imageUri || null }}
                size={84}
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                aria-label="ថតរូប"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-ink-900 bg-accent text-ink-900">
                  <Camera size={18} strokeWidth={2.25} aria-hidden="true" />
                </span>
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className={cx('truncate text-title-sm font-bold', name.trim() ? 'text-white' : 'text-ink-300')}>
                {name.trim() || 'ឈ្មោះទំនិញ'}
              </p>
              <p className="truncate text-meta text-ink-300">
                {categories.find((c) => c.id === categoryId)?.label ?? categoryId}
                {barcode.trim() && <> · <span className="font-mono">{barcode.trim()}</span></>}
              </p>
              <div className="mt-2">
                {(Number(stockQty) || 0) === 0
                  ? <Pill variant="danger">អស់ស្តុក</Pill>
                  : (Number(stockQty) || 0) <= (Number(lowStock) || 5)
                    ? <Pill variant="warn">ជិតអស់ · {Number(stockQty) || 0} {unit}</Pill>
                    : <Pill variant="success">មានស្តុក · {Number(stockQty) || 0} {unit}</Pill>}
              </div>
            </div>
          </div>

          {/* Photo / emoji actions */}
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-12 items-center gap-2 rounded-md bg-bg px-4 text-body-sm font-semibold text-text transition-colors active:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                <ImageIcon size={18} strokeWidth={2.25} aria-hidden="true" />
                ជ្រើសរូប
              </button>
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                aria-expanded={showEmoji}
                className={cx(
                  'flex h-12 items-center gap-2 rounded-md px-4 text-body-sm font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                  showEmoji ? 'bg-ink-900 text-white' : 'bg-bg text-text active:bg-line',
                )}
              >
                <span aria-hidden="true">😊</span>
                ជ្រើស Emoji
                {showEmoji ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </button>
              {imageUri && (
                <button
                  type="button"
                  onClick={() => { setImageUri(''); setShowEmoji(true) }}
                  className="flex h-12 items-center gap-2 rounded-md bg-danger-bg px-4 text-body-sm font-semibold text-danger transition-colors active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                >
                  <X size={16} strokeWidth={2.5} aria-hidden="true" />
                  លុបរូប
                </button>
              )}
            </div>
            {/* Camera input — opens rear camera directly */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImagePick}
            />
            {/* Gallery input — photo library picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />

            {/* Emoji grid */}
            {showEmoji && (
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-pressed={emoji === e && !imageUri}
                    className={cx(
                      'flex h-12 items-center justify-center rounded-sm text-title transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink-900',
                      emoji === e && !imageUri ? 'bg-accent' : 'bg-bg active:bg-line',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name — Khmer and/or English in one box */}
          <Input
            label="ឈ្មោះទំនិញ *"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ឧ. អង្ករ ២គីឡូ / Rice 2kg"
            hint="អាចសរសេរខ្មែរ និង English ជាមួយគ្នាបាន"
          />

          {/* Barcode */}
          <div>
            <div className="flex gap-2">
              <div
                className={cx(
                  'flex min-h-[54px] min-w-0 flex-1 items-center gap-2 rounded-[18px] px-4 transition-shadow focus-within:ring-2 focus-within:ring-ink-900/20',
                  barcodeStatus === 'ok'  ? 'bg-success-bg'
                  : barcodeStatus === 'dup' ? 'bg-danger-bg'
                  : 'bg-bg',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col py-1.5">
                  <label htmlFor="product-barcode" className="text-caption font-semibold text-text-subtle">
                    Barcode <span className="font-normal">(ស្រេចចិត្ត)</span>
                  </label>
                  <input
                    id="product-barcode"
                    type="text"
                    inputMode="numeric"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="ឧ. 8851234567890"
                    className="w-full min-w-0 bg-transparent font-mono text-body font-semibold text-text outline-none placeholder:font-normal placeholder:text-text-muted"
                  />
                </div>
                {barcodeStatus === 'ok' && (
                  <CheckCircle2 size={20} className="shrink-0 text-success" aria-hidden="true" />
                )}
                {barcodeStatus === 'dup' && (
                  <AlertCircle size={20} className="shrink-0 text-danger" aria-hidden="true" />
                )}
              </div>
              {/* Scan button */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] bg-ink-900 text-accent transition-colors active:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                aria-label="ស្កែន Barcode"
              >
                <ScanLine size={22} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
            {barcodeStatus === 'dup' && (
              <p className="mt-1 flex items-start gap-1.5 px-1 text-meta font-semibold text-danger">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                Barcode នេះមានស្រាប់ក្នុងទំនិញផ្សេងហើយ
              </p>
            )}
            {barcodeStatus === 'ok' && (
              <p className="mt-1 px-1 text-meta font-semibold text-success">
                ✓ Barcode ល្អ — អាចប្រើបាន
              </p>
            )}
          </div>

          {/* Category — selectable + manageable (add / rename / delete) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-meta font-semibold text-text-subtle">ប្រភេទ</p>
              <button
                type="button"
                onClick={() => { setManageCats((v) => !v); setEditingCat(null) }}
                className="flex h-12 items-center gap-1.5 rounded-sm px-3 text-meta font-semibold text-text transition-colors active:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                {manageCats
                  ? <><Check size={16} strokeWidth={2.5} aria-hidden="true" /> រួចរាល់</>
                  : <><Pencil size={16} strokeWidth={2.25} aria-hidden="true" /> កែ</>}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) =>
                editingCat === cat.id ? (
                  /* Inline rename */
                  <div key={cat.id} className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editCatValue}
                      onChange={(e) => setEditCatValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRenameCat() }}
                      aria-label="ឈ្មោះប្រភេទ"
                      className="h-12 w-32 rounded-sm bg-bg px-3 text-body-sm font-semibold text-text outline-none ring-2 ring-ink-900/20"
                    />
                    <button
                      type="button"
                      onClick={commitRenameCat}
                      className="flex h-12 w-12 items-center justify-center rounded-sm bg-ink-900 text-white active:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                      aria-label="រក្សាទុក"
                    >
                      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div key={cat.id} className={cx('flex items-center rounded-sm', manageCats && 'bg-bg')}>
                    <button
                      type="button"
                      onClick={() => (manageCats ? startRenameCat(cat.id) : setCategoryId(cat.id))}
                      aria-pressed={manageCats ? undefined : categoryId === cat.id}
                      className={cx(
                        'h-12 rounded-sm px-4 text-body-sm font-semibold transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                        manageCats
                          ? 'text-text active:bg-line'
                          : categoryId === cat.id
                            ? 'bg-ink-900 text-white'
                            : 'bg-bg text-text-subtle active:bg-line',
                      )}
                    >
                      {cat.label}
                    </button>
                    {manageCats && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCat(cat.id)}
                        className="flex h-12 w-10 items-center justify-center rounded-sm text-danger active:bg-danger-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                        aria-label={`លុប ${cat.label}`}
                      >
                        <X size={16} strokeWidth={2.75} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {manageCats && (
              <p className="mt-1.5 text-caption text-text-muted">
                ចុច​ប្រភេទ​ដើម្បី​កែ​ឈ្មោះ · ចុច × ដើម្បី​លុប
              </p>
            )}

            {/* Add new category */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCat() } }}
                placeholder="បន្ថែម​ប្រភេទ​ថ្មី…"
                aria-label="បន្ថែម​ប្រភេទ​ថ្មី"
                className="h-12 min-w-0 flex-1 rounded-sm bg-bg px-4 text-body text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-ink-900/20"
              />
              <Button
                variant="dark"
                onClick={handleAddCat}
                disabled={!newCat.trim()}
                icon={<Plus size={18} strokeWidth={2.5} />}
                className="shrink-0"
              >
                បន្ថែម
              </Button>
            </div>
          </div>

          {/* Unit — selectable + manageable (add / rename / delete) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-meta font-semibold text-text-subtle">ឯកតា</p>
              <button
                type="button"
                onClick={() => { setManageUnits((v) => !v); setEditingUnit(null) }}
                className="flex h-12 items-center gap-1.5 rounded-sm px-3 text-meta font-semibold text-text transition-colors active:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                {manageUnits
                  ? <><Check size={16} strokeWidth={2.5} aria-hidden="true" /> រួចរាល់</>
                  : <><Pencil size={16} strokeWidth={2.25} aria-hidden="true" /> កែ</>}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {units.map((u) =>
                editingUnit === u ? (
                  /* Inline rename */
                  <div key={u} className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editUnitValue}
                      onChange={(e) => setEditUnitValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRenameUnit() }}
                      aria-label="ឈ្មោះឯកតា"
                      className="h-12 w-28 rounded-sm bg-bg px-3 text-body-sm font-semibold text-text outline-none ring-2 ring-ink-900/20"
                    />
                    <button
                      type="button"
                      onClick={commitRenameUnit}
                      className="flex h-12 w-12 items-center justify-center rounded-sm bg-ink-900 text-white active:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                      aria-label="រក្សាទុក"
                    >
                      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div key={u} className={cx('flex items-center rounded-sm', manageUnits && 'bg-bg')}>
                    <button
                      type="button"
                      onClick={() => (manageUnits ? startRenameUnit(u) : setUnit(u))}
                      aria-pressed={manageUnits ? undefined : unit === u}
                      className={cx(
                        'h-12 rounded-sm px-4 text-body-sm font-semibold transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                        manageUnits
                          ? 'text-text active:bg-line'
                          : unit === u
                            ? 'bg-ink-900 text-white'
                            : 'bg-bg text-text-subtle active:bg-line',
                      )}
                    >
                      {u}
                    </button>
                    {manageUnits && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUnit(u)}
                        className="flex h-12 w-10 items-center justify-center rounded-sm text-danger active:bg-danger-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                        aria-label={`លុប ${u}`}
                      >
                        <X size={16} strokeWidth={2.75} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {manageUnits && (
              <p className="mt-1.5 text-caption text-text-muted">
                ចុច​ឯកតា​ដើម្បី​កែ​ឈ្មោះ · ចុច × ដើម្បី​លុប
              </p>
            )}

            {/* Add new unit */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit() } }}
                placeholder="បន្ថែម​ឯកតា​ថ្មី…"
                aria-label="បន្ថែម​ឯកតា​ថ្មី"
                className="h-12 min-w-0 flex-1 rounded-sm bg-bg px-4 text-body text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-ink-900/20"
              />
              <Button
                variant="dark"
                onClick={handleAddUnit}
                disabled={!newUnit.trim()}
                icon={<Plus size={18} strokeWidth={2.5} />}
                className="shrink-0"
              >
                បន្ថែម
              </Button>
            </div>
          </div>

          {/* Price — sell + cost, enter in ៛ or $ */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-meta font-semibold text-text-subtle">តម្លៃ</p>
              <SegmentedControl
                ariaLabel="រូបិយប័ណ្ណតម្លៃ"
                className="w-36"
                items={[
                  { value: 'KHR', label: '៛' },
                  { value: 'USD', label: '$' },
                ]}
                value={priceCurrency}
                onChange={switchPriceCurrency}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="តម្លៃលក់ *"
                type="number"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0"
                className="text-title-sm font-bold tabular-nums"
                trailing={<span className="text-body font-bold text-text-subtle">{priceCurrency === 'USD' ? '$' : '៛'}</span>}
                hint={priceCurrency === 'USD' && Number(sellPrice) > 0
                  ? `≈ ${formatKHR(toKHR(Math.round(Number(sellPrice) * getExchangeRate())))}`
                  : undefined}
              />
              <Input
                label="ថ្លៃទិញ (ស្រេចចិត្ត)"
                type="number"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder={sellPrice ? String(+(Number(sellPrice) * 0.7).toFixed(priceCurrency === 'USD' ? 2 : 0)) : '0'}
                className="text-title-sm tabular-nums"
                trailing={<span className="text-body font-bold text-text-subtle">{priceCurrency === 'USD' ? '$' : '៛'}</span>}
                hint={priceCurrency === 'USD' && Number(costPrice) > 0
                  ? `≈ ${formatKHR(toKHR(Math.round(Number(costPrice) * getExchangeRate())))}`
                  : undefined}
              />
            </div>

            {/* Profit per unit — display only, from the form values */}
            {sellPrice && costPrice && Number(costPrice) > 0 && Number(sellPrice) > 0 && (() => {
              const diff     = Number(sellPrice) - Number(costPrice)
              const diffRiel = toKHR(priceCurrency === 'USD' ? diff * getExchangeRate() : diff)
              const positive = diff >= 0
              return (
                <div className={cx('mt-3 flex items-center justify-between gap-3 rounded-md px-4 py-3', positive ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>
                  <span className="text-body-sm font-semibold">ចំណេញក្នុងមួយឯកតា</span>
                  <span className="text-right tabular-nums">
                    <span className="block text-body font-bold">{formatKHR(diffRiel)} · {formatUSD(diffRiel)}</span>
                    <span className="block text-meta font-semibold">
                      ចំណេញ {Math.round(((Number(sellPrice) - Number(costPrice)) / Number(sellPrice)) * 100)}%
                    </span>
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Stock qty + low-stock threshold, each with a +/− stepper */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cx(
                'flex min-h-[54px] items-center rounded-[18px] transition-shadow focus-within:ring-2 focus-within:ring-ink-900/20',
                (Number(stockQty) || 0) <= (Number(lowStock) || 5) ? 'bg-warn-bg' : 'bg-bg',
              )}
            >
              <button
                type="button"
                onClick={() => setStockQty(v => String(Math.max(0, (Number(v) || 0) - 1)))}
                className="flex h-12 w-11 shrink-0 items-center justify-center rounded-[14px] text-title font-semibold text-text-subtle transition-colors active:bg-line focus-visible:outline-2 focus-visible:outline-ink-900"
                aria-label="បន្ថយស្តុក"
              >
                −
              </button>
              <div className="flex min-w-0 flex-1 flex-col items-center py-1.5">
                <label htmlFor="product-stock" className="text-caption font-semibold text-text-subtle">ចំនួនស្តុក</label>
                <input
                  id="product-stock"
                  type="number"
                  inputMode="numeric"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-center text-title-sm font-bold tabular-nums text-text outline-none placeholder:text-text-muted"
                />
              </div>
              <button
                type="button"
                onClick={() => setStockQty(v => String((Number(v) || 0) + 1))}
                className="flex h-12 w-11 shrink-0 items-center justify-center rounded-[14px] text-title font-semibold text-text-subtle transition-colors active:bg-line focus-visible:outline-2 focus-visible:outline-ink-900"
                aria-label="បន្ថែមស្តុក"
              >
                +
              </button>
            </div>

            <div className="flex min-h-[54px] items-center rounded-[18px] bg-bg transition-shadow focus-within:ring-2 focus-within:ring-ink-900/20">
              <button
                type="button"
                onClick={() => setLowStock(v => String(Math.max(1, (Number(v) || 5) - 1)))}
                className="flex h-12 w-11 shrink-0 items-center justify-center rounded-[14px] text-title font-semibold text-text-subtle transition-colors active:bg-line focus-visible:outline-2 focus-visible:outline-ink-900"
                aria-label="បន្ថយកម្រិតជូនដំណឹង"
              >
                −
              </button>
              <div className="flex min-w-0 flex-1 flex-col items-center py-1.5">
                <label htmlFor="product-low" className="text-caption font-semibold text-text-subtle">ជូនដំណឹងនៅ</label>
                <input
                  id="product-low"
                  type="number"
                  inputMode="numeric"
                  value={lowStock}
                  onChange={(e) => setLowStock(e.target.value)}
                  placeholder="5"
                  className="w-full min-w-0 bg-transparent text-center text-title-sm font-bold tabular-nums text-text outline-none placeholder:text-text-muted"
                />
              </div>
              <button
                type="button"
                onClick={() => setLowStock(v => String((Number(v) || 5) + 1))}
                className="flex h-12 w-11 shrink-0 items-center justify-center rounded-[14px] text-title font-semibold text-text-subtle transition-colors active:bg-line focus-visible:outline-2 focus-visible:outline-ink-900"
                aria-label="បន្ថែមកម្រិតជូនដំណឹង"
              >
                +
              </button>
            </div>
          </div>
          <p className="-mt-3 flex items-start gap-1.5 px-1 text-meta text-warn">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            ស្តុកធ្លាក់ចុះ ≤ {lowStock || '5'} — ជូនដំណឹង
          </p>

          {/* Delete — 2-step confirm */}
          {isEdit && !confirmDel && (
            <Button
              variant="dangerSoft"
              fullWidth
              onClick={() => setConfirmDel(true)}
              icon={<Trash2 size={18} strokeWidth={2.25} />}
            >
              លុបទំនិញ
            </Button>
          )}

          {isEdit && confirmDel && (
            <div className="space-y-2 rounded-md bg-danger-bg p-3">
              <p className="flex items-center justify-center gap-2 text-body-sm font-semibold text-danger">
                <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
                ប្រាកដទេ? ទំនិញនឹងបាត់ចេញពី List!
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="h-12 flex-1 rounded-md bg-danger text-body-sm font-bold text-white transition-[filter] active:brightness-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                >
                  {deleting ? '…' : 'បាទ/ចាស លុប'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(false)}
                  className="h-12 flex-1 rounded-md bg-surface text-body-sm font-semibold text-text transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                >
                  បោះបង់
                </button>
              </div>
            </div>
          )}
        </div>
      </Sheet>

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
    </>
  )
}
