'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ScanLine, X, CheckCircle2, ShoppingCart, ChevronUp, Receipt } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR, addKHR, toKHR, multiplyKHR, subtractKHR } from '@/lib/money'
import { nowISO } from '@/lib/date'
import { saleService } from '@/services/sale.service'
import { debtService } from '@/services/debt.service'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { db } from '@/db'
import type { KHR } from '@/types'
import type { TenantId, UserId, CustomerId } from '@/types/branded'
import { productMatchesQuery } from '@/lib/search'
import { useCategoryStore } from '@/store/category.store'
import { ProductCard } from './ProductCard'
import { CategoryTabs, type TabCategory } from './CategoryTabs'
import { FlyToCartOverlay, type FlyItem } from '@/components/shared/FlyToCartOverlay'
import { CartPanel } from './CartPanel'
import { CheckoutSheet } from './CheckoutSheet'
import { SaleReceiptSheet, type ReceiptData } from './SaleReceiptSheet'
import { BarcodeScannerSheet } from './BarcodeScannerSheet'
import { OpenShiftSheet } from './OpenShiftSheet'
import { CloseShiftSheet } from './CloseShiftSheet'
import { useStoreProfile } from '@/store/storeProfile.store'
import { cashDrawerService } from '@/services/cashDrawer.service'
import type { CashDrawer } from '@/types'

const DEMO_TENANT  = 'tenant-demo'  as TenantId
const DEMO_CASHIER = 'cashier-demo' as UserId

type Success = {
  type: 'cash' | 'debt' | 'partial'
  amount: KHR
  change: KHR | null
  customerName: string | null
  partialDebt?: KHR | null
} | null

export function POSScreen() {
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState<string>('all')
  const [isCartOpen, setCartOpen]   = useState(false)
  const [checkout,   setCheckout]   = useState<{ type: 'cash' | 'debt' | 'partial' } | null>(null)
  const [success,    setSuccess]    = useState<Success>(null)
  const [receipt,    setReceipt]    = useState<{ data: ReceiptData; open: boolean } | null>(null)
  const [scanning,    setScanning]    = useState(false)
  const [openShift,   setOpenShift]   = useState(false)
  const [closeShift,  setCloseShift]  = useState(false)
  const [flyItems,    setFlyItems]    = useState<FlyItem[]>([])
  const cartBtnRef = useRef<HTMLButtonElement>(null)

  const { cashierName } = useStoreProfile()

  /* Live current cash drawer */
  const currentDrawer = useLiveQuery(
    () => cashDrawerService.getCurrent(DEMO_TENANT),
    []
  ) as CashDrawer | null | undefined

  const shiftOpen = !!currentDrawer

  /* Managed categories (shared store) — drives the filter tabs */
  const categories = useCategoryStore((s) => s.categories)

  /* Products from DB (live — updates when stock changes) */
  const dbProducts = useLiveQuery(
    () => db.products.where('tenantId').equals(DEMO_TENANT).filter((p) => !p.deletedAt).toArray(),
    []
  ) ?? []

  /* Seed mock data to DB on first run */
  useEffect(() => {
    productService.seedIfEmpty(DEMO_TENANT).catch(() => {})
    customerService.seedIfEmpty(DEMO_TENANT).catch(() => {})
  }, [])

  /* Live shift/session activity — grows as sales complete (feels operational) */
  const [session, setSession] = useState({ total: toKHR(125_000), count: 23 })

  const cart        = useSaleStore((s) => s.cart)
  const cartTotal   = useSaleStore((s) => s.cartTotal)
  const cartCount   = useSaleStore((s) => s.cartCount)
  const clearCart   = useSaleStore((s) => s.clearCart)

  const count = cartCount()
  const total = cartTotal()

  /* Filter products by category + smart search (Khmer/English/barcode/price) */
  const filteredProducts = useMemo(
    () =>
      dbProducts.filter((p) => {
        const matchSearch = productMatchesQuery(p, search)
        const matchCat = category === 'all' || p.categoryId === category
        return matchSearch && matchCat
      }),
    [dbProducts, search, category]
  )

  /* Live per-category counts for the tab badges */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: dbProducts.length }
    for (const p of dbProducts) {
      const c = p.categoryId
      if (!c) continue
      counts[c] = (counts[c] ?? 0) + 1
    }
    return counts
  }, [dbProducts])

  /* Tab list — "all" first, then only categories that actually have products
     (empty / unused categories stay hidden from the filter bar) */
  const tabCategories = useMemo<TabCategory[]>(
    () => [
      { id: 'all', label: 'ទាំងអស់' },
      ...categories
        .filter((c) => (categoryCounts[c.id] ?? 0) > 0)
        .map((c) => ({ id: c.id, label: c.label })),
    ],
    [categories, categoryCounts]
  )

  /* If the active filter's category becomes empty, fall back to "all" */
  useEffect(() => {
    if (category !== 'all' && (categoryCounts[category] ?? 0) === 0) setCategory('all')
  }, [categoryCounts, category])

  /* Auto-dismiss success banner — pause when receipt sheet is open */
  useEffect(() => {
    if (!success || receipt?.open) return
    const t = setTimeout(() => setSuccess(null), 3500)
    return () => clearTimeout(t)
  }, [success, receipt?.open])

  /* Close cart sheet when cart becomes empty */
  useEffect(() => {
    if (cart.length === 0) setCartOpen(false)
  }, [cart.length])

  /* ── Fly-to-cart animation ───────────────────────────────────── */
  const handleFly = (startX: number, startY: number, emoji: string, imageUri: string | null) => {
    // Target: cart button (mobile) or cart panel header (tablet)
    let endX = 40, endY = window.innerHeight - 40   // fallback bottom-left
    if (cartBtnRef.current) {
      const r = cartBtnRef.current.getBoundingClientRect()
      endX = r.left + r.width  / 2
      endY = r.top  + r.height / 2
    }
    const id = `fly-${Date.now()}-${Math.random()}`
    setFlyItems(prev => [...prev, { id, emoji, imageUri, startX, startY, endX, endY }])
  }

  /* Step 1 — open the checkout/confirmation sheet for the chosen method */
  const handlePay = (type: 'cash' | 'debt' | 'partial') => {
    if (count === 0) return
    setCheckout({ type })
  }

  /* Step 2 — cashier confirmed: record the sale and show success */
  const finalizeSale = (
    type: 'cash' | 'debt' | 'partial',
    result: { change: KHR | null; customerName: string | null; customerId: CustomerId | null; discount: KHR; partialDebt: KHR | null }
  ) => {
    const subtotal  = total
    const discount  = result.discount
    const amount    = subtractKHR(subtotal, discount)    // final amount (after discount)
    const cartSnap  = [...cart]
    const now       = nowISO()

    // For partial: paidNow = amount − partialDebt
    const partialDebtAmt = result.partialDebt ?? toKHR(0)
    const paidNow: KHR   = type === 'partial'
      ? subtractKHR(amount, partialDebtAmt)
      : type === 'cash'
        ? addKHR(amount, result.change ?? toKHR(0))
        : toKHR(0)

    // Build receipt items from cart snapshot (before clearing) — net after line discount
    const receiptItems = cartSnap.map((item) => {
      const gross = multiplyKHR(item.unitPrice, item.qty)
      const net   = Math.max(0, gross - (item.lineDiscount ?? 0)) as KHR
      return {
        nameKm:    item.product.nameKm,
        qty:       item.qty,
        unitPrice: item.unitPrice,
        subtotal:  net,
      }
    })

    // Receipt number: YYYYMMDD + random 4 chars
    const shortDate     = now.slice(0, 10).replace(/-/g, '')
    const shortRef      = Math.random().toString(36).slice(2, 6).toUpperCase()
    const receiptNumber = `${shortDate}-${shortRef}`

    const cashReceived = type === 'cash' ? paidNow : type === 'partial' ? paidNow : null

    setReceipt({
      data: {
        receiptNumber,
        cashierName,
        items:        receiptItems,
        discount,
        totalAmount:  amount,
        paymentType:  type === 'partial' ? 'debt' : type,  // receipt shows debt for partial
        cashReceived,
        changeGiven:  type === 'cash' ? result.change : null,
        customerName: result.customerName,
        createdAt:    now,
      },
      open: false,
    })

    setSession((s) => ({ total: addKHR(s.total, amount), count: s.count + 1 }))
    clearCart()
    setCheckout(null)
    setCartOpen(false)
    setSuccess({ type, amount, change: result.change, customerName: result.customerName, partialDebt: result.partialDebt })

    // Persist to IndexedDB — then charge debt if applicable
    saleService.create({
      tenantId:    DEMO_TENANT,
      cashierId:   DEMO_CASHIER,
      cart:        cartSnap,
      paymentType: type === 'partial' ? 'debt' : type,
      paidAmount:  type === 'cash' ? paidNow : type === 'partial' ? paidNow : toKHR(0),
      ...(discount ? { discount } : {}),
      ...(result.customerId ? { customerId: result.customerId } : {}),
      ...(result.customerName ? { note: result.customerName } : {}),
    }).then((saleResult) => {
      if (saleResult.ok && result.customerId) {
        if (type === 'debt') {
          debtService.charge({
            tenantId:   DEMO_TENANT,
            customerId: result.customerId,
            saleId:     saleResult.data.id,
            amount,
          }).catch(() => {})
        } else if (type === 'partial' && partialDebtAmt > 0) {
          debtService.charge({
            tenantId:   DEMO_TENANT,
            customerId: result.customerId,
            saleId:     saleResult.data.id,
            amount:     partialDebtAmt,
          }).catch(() => {})
        }
      }
    }).catch(() => { /* silent — sync queue retries */ })
  }

  /* ────────────────────────────────────────────────────────── */

  return (
    <div className="flex h-full overflow-hidden bg-surface">

      {/* ════════════════════════════════════════════════════
          LEFT — Header + Search + Product Grid
      ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Operational header ───────────────────────────── */}
        <header className="bg-white border-b border-slate-200 shadow-sm px-4 pt-3 pb-3 space-y-3 shrink-0 z-10">
          <div className="flex items-center justify-between gap-3">

            {/* Store / cashier identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-[15px] shrink-0 shadow-sm">
                ហ
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                  ហាងលក់ទំនិញ
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] leading-tight mt-0.5">
                  <span className="flex items-center gap-1 font-medium text-success-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                    អនឡាញ
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 tabular-nums">វេន ៧:៣០</span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <span className="hidden sm:inline text-slate-500">សុខា</span>
                </div>
              </div>
            </div>

            {/* Shift status + scan */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Cash Drawer button */}
              {shiftOpen ? (
                <button
                  type="button"
                  onClick={() => setCloseShift(true)}
                  className="flex flex-col items-end px-2.5 py-1.5 rounded-lg bg-success-50 border border-success-200 active:bg-success-100 transition-colors"
                >
                  <span className="flex items-center gap-1 text-[9px] font-bold text-success-600 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                    វេនបើក
                  </span>
                  <span className="text-[12px] font-bold text-success-800 tabular-nums leading-tight mt-0.5">
                    {formatKHR(currentDrawer!.openingBalance)}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenShift(true)}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 text-slate-600 text-[12px] font-bold active:bg-slate-50 transition-colors"
                >
                  💰 បើកវេន
                </button>
              )}

              {/* Barcode scan */}
              <button
                type="button"
                onClick={() => setScanning(true)}
                aria-label="ស្កែនបាកូដ"
                className="min-w-0 w-10 h-10 flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 active:bg-slate-50 transition-colors shrink-0"
              >
                <ScanLine size={19} strokeWidth={2.25} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ស្វែង ឈ្មោះ · EN · barcode · តម្លៃ…"
              className={[
                'w-full h-12 pl-11 pr-11 rounded-xl text-sm',
                'bg-white border border-slate-200 shadow-xs',
                'placeholder:text-slate-400',
                'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15',
                'transition-colors',
              ].join(' ')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="min-h-0 min-w-0 absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <CategoryTabs categories={tabCategories} active={category} onChange={setCategory} counts={categoryCounts} />
        </header>

        {/* ── Product grid ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <Search size={26} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-slate-500">
                {search ? `រកមិនឃើញ «${search}»` : 'គ្មានទំនិញក្នុងប្រភេទនេះ'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onFly={handleFly}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Mobile checkout bar (above bottom nav) ───────── */}
        {count > 0 && (
          <div className="md:hidden shrink-0 px-3 pb-3 pt-1 bg-surface">
            <button
              type="button"
              ref={cartBtnRef}
              onClick={() => setCartOpen(true)}
              className={[
                'w-full h-14 rounded-xl bg-primary-600 text-white',
                'shadow-lg shadow-primary-600/25',
                'flex items-center justify-between pl-3 pr-4',
                'active:bg-primary-700 active:scale-[0.99] transition-all',
              ].join(' ')}
            >
              <span className="flex items-center gap-2.5">
                <span className="relative">
                  <ShoppingCart size={22} strokeWidth={2.25} />
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-primary-700 text-[11px] font-bold flex items-center justify-center tabular-nums">
                    {count}
                  </span>
                </span>
                <span className="font-bold text-[15px]">មើលរទេះ</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-extrabold text-[16px] tabular-nums tracking-tight">
                  {formatKHR(total)}
                </span>
                <ChevronUp size={18} strokeWidth={2.5} className="opacity-80" />
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          RIGHT — Cart sidebar (tablet / desktop)
      ════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-80 lg:w-[22rem] bg-white border-l border-slate-200 shadow-[-4px_0_24px_-16px_rgba(15,23,42,0.25)] shrink-0">
        <CartPanel onPay={handlePay} />
      </aside>

      {/* ════════════════════════════════════════════════════
          MOBILE — Cart bottom sheet
      ════════════════════════════════════════════════════ */}
      {isCartOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50"
          onClick={() => setCartOpen(false)}
          aria-hidden="true"
        >
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[88dvh] flex flex-col shadow-pop animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="shrink-0 flex justify-center pt-2.5 pb-1.5">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            <CartPanel onPay={handlePay} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CHECKOUT — confirmation + payment sheet
      ════════════════════════════════════════════════════ */}
      {checkout && (
        <CheckoutSheet
          type={checkout.type}
          onClose={() => setCheckout(null)}
          onConfirm={(result) => finalizeSale(checkout.type, { ...result, partialDebt: result.partialDebt ?? null })}
        />
      )}

      {/* ════════════════════════════════════════════════════
          SUCCESS STATE
      ════════════════════════════════════════════════════ */}
      {success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-6"
          role="status"
          aria-live="polite"
          onClick={() => setSuccess(null)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl p-6 text-center shadow-pop animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={[
                'mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-4',
                success.type === 'cash'    ? 'bg-success-100 text-success-600'
                : success.type === 'partial' ? 'bg-warning-100 text-warning-700'
                : 'bg-slate-100 text-slate-700',
              ].join(' ')}
            >
              <CheckCircle2 size={36} strokeWidth={2.25} />
            </div>

            <p className="text-[16px] font-bold text-slate-900">
              {success.type === 'cash' ? 'ទូទាត់ជោគជ័យ'
              : success.type === 'partial' ? 'ទូទាត់ផ្នែកជោគជ័យ'
              : 'កត់ត្រាបំណុលរួចរាល់'}
            </p>
            <p className="text-[28px] font-extrabold text-slate-900 tabular-nums mt-1 tracking-tight">
              {formatKHR(success.amount)}
            </p>

            {success.type === 'cash' && success.change !== null && success.change > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-success-50 px-4 py-2.5">
                <span className="text-[13px] font-medium text-success-700">ប្រាក់អាប់</span>
                <span className="text-[18px] font-extrabold text-success-700 tabular-nums">
                  {formatKHR(success.change)}
                </span>
              </div>
            )}

            {success.type === 'partial' && success.partialDebt != null && success.partialDebt > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-warning-50 border border-warning-100 px-3 py-2">
                  <p className="text-[10px] text-warning-600 font-semibold">ទូទាត់ហើយ</p>
                  <p className="text-[15px] font-extrabold text-warning-800 tabular-nums">
                    {formatKHR(subtractKHR(success.amount, success.partialDebt as KHR))}
                  </p>
                </div>
                <div className="rounded-xl bg-danger-50 border border-danger-100 px-3 py-2">
                  <p className="text-[10px] text-danger-600 font-semibold">នៅជំពាក់</p>
                  <p className="text-[15px] font-extrabold text-danger-700 tabular-nums">
                    {formatKHR(success.partialDebt as KHR)}
                  </p>
                </div>
              </div>
            )}

            {(success.type === 'debt' || success.type === 'partial') && success.customerName && (
              <p className="text-[13px] text-slate-500 mt-3">
                អ្នកជំពាក់៖{' '}
                <span className="font-semibold text-slate-700">{success.customerName}</span>
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {receipt && (
                <button
                  type="button"
                  onClick={() => setReceipt((r) => r ? { ...r, open: true } : null)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[14px] flex items-center justify-center gap-2 active:bg-slate-100 transition-colors"
                >
                  <Receipt size={16} strokeWidth={2} />
                  មើលវិក្កយបត្រ
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSuccess(null); setReceipt(null) }}
                className="w-full h-12 rounded-xl bg-primary-600 text-white font-bold text-[15px] active:bg-primary-700 transition-colors"
              >
                លក់ថ្មី
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          RECEIPT SHEET
      ════════════════════════════════════════════════════ */}
      {receipt?.open && (
        <SaleReceiptSheet
          data={receipt.data}
          onClose={() => setReceipt((r) => r ? { ...r, open: false } : null)}
        />
      )}

      {/* ════════════════════════════════════════════════════
          BARCODE SCANNER SHEET
      ════════════════════════════════════════════════════ */}
      {scanning && (
        <BarcodeScannerSheet onClose={() => setScanning(false)} />
      )}

      {/* ════════════════════════════════════════════════════
          CASH DRAWER — OPEN SHIFT
      ════════════════════════════════════════════════════ */}
      {openShift && (
        <OpenShiftSheet
          cashierName={cashierName}
          onOpened={() => setOpenShift(false)}
          onClose={() => setOpenShift(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════
          CASH DRAWER — CLOSE SHIFT
      ════════════════════════════════════════════════════ */}
      {closeShift && currentDrawer && (
        <CloseShiftSheet
          drawer={currentDrawer}
          onClosed={() => setCloseShift(false)}
          onClose={() => setCloseShift(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════
          FLY-TO-CART ANIMATION OVERLAY
      ════════════════════════════════════════════════════ */}
      <FlyToCartOverlay
        items={flyItems}
        onDone={(id) => setFlyItems(prev => prev.filter(f => f.id !== id))}
      />
    </div>
  )
}
