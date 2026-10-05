'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Check, Receipt, PauseCircle, Clock, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { cx } from '@/components/ui/cx'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR, formatUSD, addKHR, toKHR, multiplyKHR, subtractKHR } from '@/lib/money'
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
import { SearchInput } from '@/components/ui/SearchInput'
import { CartPanel } from './CartPanel'
import { CartChromeContext } from './cartChrome'
import { CheckoutSheet } from './CheckoutSheet'
import { SaleReceiptSheet, type ReceiptData } from './SaleReceiptSheet'
import { HeldInvoicesSheet } from './HeldInvoicesSheet'
import { heldInvoiceService } from '@/services/heldInvoice.service'
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
  const [showHeld,    setShowHeld]    = useState(false)
  const [openShift,   setOpenShift]   = useState(false)
  const [closeShift,  setCloseShift]  = useState(false)
  const [flyItems,    setFlyItems]    = useState<FlyItem[]>([])
  const cartBtnRef   = useRef<HTMLButtonElement>(null)   // mobile checkout bar (only when count>0)
  const cartPanelRef = useRef<HTMLElement>(null)         // desktop cart sidebar (always rendered)

  const { storeName, cashierName } = useStoreProfile()

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
  const setCart     = useSaleStore((s) => s.setCart)

  const count = cartCount()
  const total = cartTotal()

  /* Held (parked) invoices — count for the header button */
  const heldCount = useLiveQuery(
    () => db.heldInvoices.where('tenantId').equals(DEMO_TENANT).count(),
    []
  ) ?? 0

  /* Hold the current cart as a draft, then clear for the next customer */
  const handleHold = async () => {
    if (count === 0) return
    await heldInvoiceService.hold({
      tenantId: DEMO_TENANT,
      items:    [...cart],
      total,
      count,
    })
    clearCart()
    setCartOpen(false)
  }

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
    const id = `fly-${Date.now()}-${Math.random()}`
    // Defer one frame: the first tap renders the mobile cart bar (count 0→1),
    // so we must read the target *after* that DOM update. We pick whichever
    // cart target is actually visible at this breakpoint (rect width > 0):
    // the mobile bar (md) or the desktop sidebar (md+). A display:none element
    // returns a zero rect, which is why we must check width before using it.
    requestAnimationFrame(() => {
      let endX = window.innerWidth / 2
      let endY = window.innerHeight - 90   // fallback: bottom-center, near where the bar sits

      const barRect   = cartBtnRef.current?.getBoundingClientRect()
      const panelRect = cartPanelRef.current?.getBoundingClientRect()

      if (barRect && barRect.width > 0) {
        // Mobile checkout bar
        endX = barRect.left + barRect.width  / 2
        endY = barRect.top  + barRect.height / 2
      } else if (panelRect && panelRect.width > 0) {
        // Desktop / tablet cart sidebar — aim near the top where items land
        endX = panelRect.left + panelRect.width / 2
        endY = panelRect.top + 72
      }

      setFlyItems(prev => [...prev, { id, emoji, imageUri, startX, startY, endX, endY }])
    })
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
        debtRemaining: type === 'partial' ? partialDebtAmt : type === 'debt' ? amount : null,
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
      receiptNumber,
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

  /* ── Presentation helpers (display only) ─────────────────────── */
  const lines        = cart.length
  const shiftLabel   = shiftOpen ? 'បិទហាង' : 'បើកហាង'
  const openShiftUi  = () => (shiftOpen ? setCloseShift(true) : setOpenShift(true))
  const headerStatus = [shiftOpen ? 'ហាងបើក' : 'មិនទាន់បើកហាង', cashierName].filter(Boolean).join(' · ')
  const heldBadge    = heldCount > 0 && (
    <span
      className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-caption font-bold leading-none text-ink-900"
      aria-hidden="true"
    >
      {heldCount > 9 ? '9+' : heldCount}
    </span>
  )
  const shiftIcon = (
    <span className="relative inline-flex">
      <Clock size={20} strokeWidth={2.25} />
      {shiftOpen && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-success-on-dark ring-2 ring-current" />}
    </span>
  )
  const paidMethodLabel = success
    ? success.type === 'cash' ? 'ទូទាត់សាច់ប្រាក់' : success.type === 'debt' ? 'ជំពាក់' : 'បង់ខ្លះ'
    : ''

  return (
    <div className="flex h-full overflow-hidden bg-bg">

      {/* ════════════════════════════════════════════════════
          iPad landscape (lg+) — category column
      ════════════════════════════════════════════════════ */}
      <aside aria-label="ប្រភេទ" className="hidden w-[196px] shrink-0 flex-col bg-surface lg:flex">
        <p className="px-5 pb-2 pt-6 text-title-sm font-bold text-text">ប្រភេទ</p>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <CategoryTabs categories={tabCategories} active={category} onChange={setCategory} counts={categoryCounts} />
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════
          Catalog — header, categories, product grid
      ════════════════════════════════════════════════════ */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Phone: compact hero header */}
        <PageHeader
          variant="hero"
          compact
          className="md:hidden"
          backHref="/"
          title="លក់"
          subtitle={headerStatus}
          actions={
            <>
              <Button
                variant="onDark"
                className="relative px-3"
                icon={<PauseCircle size={18} strokeWidth={2.25} />}
                onClick={() => setShowHeld(true)}
                aria-label={heldCount > 0 ? `វិក្កយបត្រផ្អាក ${heldCount}` : 'វិក្កយបត្រផ្អាក'}
              >
                ផ្អាក
                {heldBadge}
              </Button>
              <IconButton variant="onDark" aria-label={shiftLabel} onClick={openShiftUi}>
                {shiftIcon}
              </IconButton>
            </>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ស្វែង ឈ្មោះ · EN · barcode · តម្លៃ…"
            onScan={() => setScanning(true)}
          />
        </PageHeader>

        {/* md+: search · scan · held · shift in one row */}
        <div className="hidden items-center gap-2 px-6 pb-1 pt-5 md:flex">
          <SearchInput
            className="flex-1"
            value={search}
            onChange={setSearch}
            placeholder="ស្វែង ឈ្មោះ · EN · barcode · តម្លៃ…"
            onScan={() => setScanning(true)}
          />
          <Button
            variant="secondary"
            className="relative h-[52px]"
            icon={<PauseCircle size={18} strokeWidth={2.25} />}
            onClick={() => setShowHeld(true)}
            aria-label={heldCount > 0 ? `វិក្កយបត្រផ្អាក ${heldCount}` : 'វិក្កយបត្រផ្អាក'}
          >
            ផ្អាក
            {heldBadge}
          </Button>
          <IconButton variant="light" aria-label={shiftLabel} onClick={openShiftUi} className="h-[52px] w-[52px] text-ink-900">
            {shiftIcon}
          </IconButton>
        </div>

        {/* Categories — pills (phone + iPad portrait) */}
        <CategoryTabs
          categories={tabCategories}
          active={category}
          onChange={setCategory}
          counts={categoryCounts}
          className="shrink-0 px-4 py-3 md:px-6 lg:hidden"
        />

        {/* ── Product grid ─────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Bottom clearance for the cart bar (74 bar + 20 offset + home
              indicator + 16 air) on an inner wrapper — iOS Safari ignores a
              scroll container's own padding-bottom. */}
          <div
            className={cx(
              'px-4 pt-1 md:px-6 md:pt-3',
              count > 0 ? 'pb-[calc(110px+env(safe-area-inset-bottom))] md:pb-6' : 'pb-6',
            )}
          >
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Search size={28} strokeWidth={1.75} />}
                title={search ? `រកមិនឃើញ «${search}»` : 'គ្មានទំនិញក្នុងប្រភេទនេះ'}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:gap-3">
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
        </div>

        {/* ── Phone cart bar (fly-to-cart target) ──────────── */}
        {count > 0 && (
          <button
            type="button"
            ref={cartBtnRef}
            onClick={() => setCartOpen(true)}
            aria-label={`មើលរទេះ · ${lines} មុខ · ${formatKHR(total)}`}
            className={cx(
              'absolute inset-x-3 bottom-[calc(20px+env(safe-area-inset-bottom))] z-20 md:hidden',
              'flex h-[74px] items-center gap-3 rounded-[26px] bg-ink-900 px-2.5 text-left shadow-cartbar',
              'transition-transform active:scale-[0.99]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
            )}
          >
            <span className="flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-ink-800" aria-hidden="true">
              <span className="text-title-sm font-bold leading-none tabular-nums text-white">{count}</span>
              <span className="text-caption leading-tight text-ink-300">ឯកតា</span>
            </span>
            <span className="min-w-0 flex-1" aria-hidden="true">
              <span className="block text-title-sm font-bold tabular-nums text-white">{formatKHR(total)}</span>
              <span className="block truncate text-meta tabular-nums text-ink-300">{formatUSD(total)} · {lines} មុខ</span>
            </span>
            <span className="flex h-[54px] shrink-0 items-center gap-1 rounded-[18px] bg-accent px-4 text-body font-bold text-ink-900" aria-hidden="true">
              ទូទាត់
              <ArrowRight size={18} strokeWidth={2.5} />
            </span>
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          RIGHT — Cart sidebar (md+), dark — fly-to-cart target
      ════════════════════════════════════════════════════ */}
      <aside
        ref={cartPanelRef}
        aria-label="រទេះ"
        className="hidden w-[320px] shrink-0 flex-col bg-ink-900 md:flex lg:w-[364px]"
      >
        <CartChromeContext.Provider value={{ tone: 'dark', header: true }}>
          <CartPanel onPay={handlePay} onHold={handleHold} />
        </CartChromeContext.Provider>
      </aside>

      {/* ════════════════════════════════════════════════════
          PHONE — Cart (full-screen sheet)
      ════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        <Sheet
          open={isCartOpen}
          onClose={() => setCartOpen(false)}
          size="full"
          tone="bg"
          title="រទេះ"
          subtitle={`${lines} មុខ · ${count} ឯកតា`}
          headerActions={
            <IconButton aria-label="សម្អាតរទេះ" variant="light" onClick={clearCart}>
              <Trash2 size={20} strokeWidth={2.25} className="text-danger" />
            </IconButton>
          }
          bodyClassName="flex flex-col p-0"
        >
          <CartChromeContext.Provider value={{ tone: 'light', header: false }}>
            <CartPanel onPay={handlePay} onHold={handleHold} />
          </CartChromeContext.Provider>
        </Sheet>
      </div>

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
          SUCCESS — full screen (phone) / large modal (md+)
      ════════════════════════════════════════════════════ */}
      {success && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-ink-900 md:items-center md:bg-ink-900/60 md:p-6"
          role="status"
          aria-live="polite"
          onClick={() => setSuccess(null)}
        >
          <div
            className={cx(
              'flex w-full flex-col overflow-y-auto bg-ink-900 text-white animate-sheet-up',
              'px-5 pt-[max(48px,calc(env(safe-area-inset-top)+24px))] pb-[max(20px,env(safe-area-inset-bottom))]',
              'md:max-h-[92dvh] md:max-w-[520px] md:rounded-[28px] md:p-8',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent text-ink-900" aria-hidden="true">
                <Check size={40} strokeWidth={3} />
              </span>
              <p className="mt-4 text-title font-bold">លក់បានជោគជ័យ</p>
              <p className="mt-1 text-body-sm tabular-nums text-ink-300">
                {paidMethodLabel} · {formatKHR(success.amount)}
              </p>
            </div>

            {/* Change (cash) or what is still owed (debt / partial) */}
            <div className="mt-6 rounded-lg bg-ink-800 px-4 py-4">
              {success.type === 'cash' ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body font-semibold text-ink-300">អាប់ឲ្យភ្ញៀវ</span>
                  <span className="flex flex-col items-end">
                    <span className="text-amount-lg font-bold tabular-nums text-accent">
                      {formatKHR(success.change ?? toKHR(0))}
                    </span>
                    <span className="text-body-sm font-semibold tabular-nums text-ink-300">
                      {formatUSD(success.change ?? toKHR(0))}
                    </span>
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body font-semibold text-ink-300">នៅជំពាក់</span>
                    <span className="flex flex-col items-end">
                      <span className="text-amount-lg font-bold tabular-nums text-debt-on-dark">
                        {formatKHR(success.type === 'partial' ? (success.partialDebt ?? toKHR(0)) as KHR : success.amount)}
                      </span>
                      <span className="text-body-sm font-semibold tabular-nums text-ink-300">
                        {formatUSD(success.type === 'partial' ? (success.partialDebt ?? toKHR(0)) as KHR : success.amount)}
                      </span>
                    </span>
                  </div>
                  {success.type === 'partial' && success.partialDebt != null && (
                    <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-3 text-body-sm">
                      <span className="text-ink-300">ទូទាត់ហើយ</span>
                      <span className="font-bold tabular-nums text-success-on-dark">
                        {formatKHR(subtractKHR(success.amount, success.partialDebt as KHR))}
                      </span>
                    </div>
                  )}
                  {success.customerName && (
                    <p className="mt-3 text-body-sm text-ink-300">
                      អ្នកជំពាក់៖ <span className="font-semibold text-white">{success.customerName}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Receipt preview — tap to open the full receipt */}
            {receipt && (
              <button
                type="button"
                onClick={() => setReceipt((r) => r ? { ...r, open: true } : null)}
                className="mt-4 rounded-lg bg-surface p-4 text-left text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="flex items-center justify-between text-meta text-text-muted">
                  <span>វិក្កយបត្រ #{receipt.data.receiptNumber}</span>
                  <Receipt size={16} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="mt-2 block space-y-1 border-y border-dashed border-line-strong py-2">
                  {receipt.data.items.slice(0, 4).map((it, i) => (
                    <span key={i} className="flex items-baseline justify-between gap-3 text-body-sm">
                      <span className="truncate">{it.nameKm} <span className="text-text-muted">× {it.qty}</span></span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatKHR(it.subtotal)}</span>
                    </span>
                  ))}
                  {receipt.data.items.length > 4 && (
                    <span className="block text-meta text-text-muted">+{receipt.data.items.length - 4} មុខទៀត</span>
                  )}
                </span>
                <span className="mt-2 flex items-baseline justify-between">
                  <span className="text-body-sm font-semibold text-text-subtle">សរុបចុងក្រោយ</span>
                  <span className="text-title-sm font-bold tabular-nums">{formatKHR(receipt.data.totalAmount)}</span>
                </span>
              </button>
            )}

            <div className="mt-auto space-y-2.5 pt-6">
              {receipt && (
                <Button
                  variant="onDark"
                  size="lg"
                  fullWidth
                  icon={<Receipt size={18} strokeWidth={2} />}
                  onClick={() => setReceipt((r) => r ? { ...r, open: true } : null)}
                >
                  មើលវិក្កយបត្រ
                </Button>
              )}
              <Button
                variant="primary"
                size="xl"
                fullWidth
                onClick={() => { setSuccess(null); setReceipt(null) }}
              >
                លក់បន្ត
              </Button>
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
          HELD INVOICES (resume)
      ════════════════════════════════════════════════════ */}
      {showHeld && (
        <HeldInvoicesSheet
          onClose={() => setShowHeld(false)}
          onResume={(items) => { setCart(items); setCartOpen(false) }}
        />
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
