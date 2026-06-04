'use client'

import { useState, useMemo } from 'react'
import { X, Banknote, NotebookPen, Tag, Search, UserCheck, SplitSquareHorizontal, UserPlus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useSaleStore } from '@/store/sale.store'
import { customerService } from '@/services/customer.service'
import { formatKHR, formatUSD, subtractKHR, multiplyKHR, toKHR } from '@/lib/money'
import type { KHR } from '@/types'
import type { Customer } from '@/types'
import type { TenantId, CustomerId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface CheckoutSheetProps {
  type: 'cash' | 'debt' | 'partial'
  onClose: () => void
  onConfirm: (result: {
    change:       KHR | null
    customerName: string | null
    customerId:   CustomerId | null
    discount:     KHR
    partialDebt:  KHR | null   // only for 'partial' — amount left unpaid
  }) => void
}

const DENOMS         = [1000, 2000, 5000, 10000, 20000, 50000, 100000]
const DISCOUNT_CHIPS = [500, 1000, 2000, 5000] as const

export function CheckoutSheet({ type, onClose, onConfirm }: CheckoutSheetProps) {
  const cart  = useSaleStore((s) => s.cart)
  const total = useSaleStore((s) => s.cartTotal)()
  const count = useSaleStore((s) => s.cartCount)()

  const isCash    = type === 'cash'
  const isPartial = type === 'partial'
  const isDebt    = type === 'debt'

  /* Discount ─────────────────────────────────────────────────── */
  const [showDiscount,   setShowDiscount]   = useState(false)
  const [discountAmount, setDiscountAmount] = useState<KHR>(toKHR(0))
  const [discountInput,  setDiscountInput]  = useState('')

  const applyDiscount = (d: KHR) => {
    // Clamp: 0 ≤ discount ≤ total
    const clamped = Math.min(Math.max(d, 0), total) as KHR
    setDiscountAmount(clamped)
    setDiscountInput(clamped > 0 ? String(clamped) : '')
    // Reset tendered to new exact amount
    setTendered(subtractKHR(total, clamped))
  }

  /* Discounted total ─────────────────────────────────────────── */
  const discountedTotal = Math.max(total - discountAmount, 0) as KHR

  /* Cash: amount tendered ────────────────────────────────────── */
  const [tendered, setTendered] = useState<KHR>(total)
  const change = subtractKHR(tendered, discountedTotal)
  const enough = tendered >= discountedTotal

  /* Partial: cash portion paid now ───────────────────────────── */
  const [partialCash, setPartialCash] = useState<string>('')
  const partialCashAmt  = Math.max(0, Math.min(Number(partialCash) || 0, discountedTotal)) as KHR
  const partialDebtAmt  = Math.max(0, discountedTotal - partialCashAmt) as KHR
  const partialValid    = partialCashAmt > 0 && partialCashAmt < discountedTotal

  /* Debt: customer selector ──────────────────────────────────── */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch,   setCustomerSearch]   = useState('')

  const allCustomers = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter(c => !c.deletedAt)
      .sortBy('nameKm'),
    []
  ) ?? []

  const filteredCustomers = allCustomers.filter(c =>
    customerSearch === '' ||
    c.nameKm.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone ?? '').includes(customerSearch)
  )

  /* Quick-add new customer inline ───────────────────────────── */
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newName,         setNewName]         = useState('')
  const [newPhone,        setNewPhone]        = useState('')
  const [addingCustomer,  setAddingCustomer]  = useState(false)

  const handleQuickAdd = async () => {
    if (!newName.trim() || addingCustomer) return
    setAddingCustomer(true)
    const result = await customerService.create({
      tenantId: DEMO_TENANT,
      nameKm:   newName.trim(),
      ...(newPhone.trim() ? { phone: newPhone.trim() } : {}),
    })
    if (result.ok) {
      setSelectedCustomer(result.data)
      setShowAddCustomer(false)
      setNewName(''); setNewPhone('')
    }
    setAddingCustomer(false)
  }

  /* Quick-cash chips based on discounted total ───────────────── */
  const quick = useMemo<KHR[]>(() => {
    const ups = DENOMS.filter((d) => d > discountedTotal).map((d) => toKHR(d))
    return [discountedTotal, ...ups].slice(0, 6)
  }, [discountedTotal])

  /* ─────────────────────────────────────────────────────────── */

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
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className={[
              'flex items-center justify-center w-8 h-8 rounded-lg',
              isCash    ? 'bg-success-100 text-success-700'
              : isPartial ? 'bg-warning-100 text-warning-700'
              : 'bg-slate-100 text-slate-700',
            ].join(' ')}>
              {isCash    ? <Banknote size={18} strokeWidth={2.25} />
              : isPartial ? <SplitSquareHorizontal size={18} strokeWidth={2.25} />
              : <NotebookPen size={18} strokeWidth={2.25} />}
            </span>
            <span className="text-[16px] font-bold text-slate-900">
              {isCash ? 'ទូទាត់សាច់ប្រាក់' : isPartial ? 'ទូទាត់ផ្នែក + ជំពាក់' : 'ជំពាក់ — បង់ក្រោយ'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="min-h-0 min-w-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Items list */}
          <div className="px-4 pt-3">
            <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              បញ្ជីទំនិញ ({count})
            </p>
          </div>
          <div className="px-4 divide-y divide-slate-100">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[13px] text-slate-600 truncate">
                  {item.product.nameKm}
                  <span className="text-slate-400 tabular-nums"> × {item.qty}</span>
                </span>
                <span className="text-[13px] font-semibold text-slate-900 tabular-nums shrink-0">
                  {formatKHR(multiplyKHR(item.unitPrice, item.qty))}
                </span>
              </div>
            ))}
          </div>

          {/* ── Subtotal row ─────────────────────────────────── */}
          <div className="px-4 pt-3 mt-1 border-t border-slate-200">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-slate-500">
                {discountAmount > 0 ? 'សរុបរង' : 'សរុបទឹកប្រាក់'}
              </span>
              <span className={[
                'tabular-nums leading-none tracking-tight',
                discountAmount > 0
                  ? 'text-[18px] font-bold text-slate-400 line-through'
                  : 'text-[26px] font-extrabold text-slate-900',
              ].join(' ')}>
                {formatKHR(total)}
              </span>
            </div>

            {/* Discounted total — shows when discount > 0 */}
            {discountAmount > 0 && (
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-[12px] text-danger-600 font-semibold">
                  បញ្ចុះ −{formatKHR(discountAmount)}
                </span>
                <span className="text-[26px] font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {formatKHR(discountedTotal)}
                </span>
              </div>
            )}
            {/* USD equivalent of amount due */}
            <p className="text-right text-[13px] font-bold text-primary-600 tabular-nums mt-0.5">
              {formatUSD(discountedTotal)}
            </p>
          </div>

          {/* ── Discount toggle + section ─────────────────────── */}
          <div className="px-4 pt-2 pb-3">
            {!showDiscount ? (
              <button
                type="button"
                onClick={() => setShowDiscount(true)}
                className="min-h-0 flex items-center gap-1.5 text-[12px] font-semibold text-primary-600 active:text-primary-700 py-1"
              >
                <Tag size={13} strokeWidth={2.25} />
                ដាក់បញ្ចុះតម្លៃ
              </button>
            ) : (
              <div className="space-y-2.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Tag size={13} strokeWidth={2.25} />
                    បញ្ចុះតម្លៃ (រៀល)
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowDiscount(false); applyDiscount(toKHR(0)) }}
                    className="min-h-0 min-w-0 text-[11px] text-slate-400 active:text-slate-600"
                  >
                    លុបចោល ×
                  </button>
                </div>

                {/* Preset discount chips */}
                <div className="flex gap-2">
                  {DISCOUNT_CHIPS.map((chip) => {
                    const val = toKHR(chip)
                    const active = discountAmount === val
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => applyDiscount(val)}
                        className={[
                          'flex-1 h-10 rounded-lg border text-[12px] font-bold tabular-nums transition-colors min-h-0',
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 text-slate-600 active:bg-slate-50',
                        ].join(' ')}
                      >
                        {formatKHR(val)}
                      </button>
                    )
                  })}
                </div>

                {/* Free-form discount input */}
                <div className="relative flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={discountInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setDiscountInput(val)
                      const num = parseInt(val, 10)
                      applyDiscount(isNaN(num) || num < 0 ? toKHR(0) : toKHR(num))
                    }}
                    placeholder="ឬវាយតម្លៃផ្ទាល់…"
                    className="flex-1 h-11 px-4 text-[14px] font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
                  />
                  <span className="pr-3 text-[13px] text-slate-400 shrink-0">៛</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Payment-specific section ─────────────────────── */}
          {isCash ? (
            <div className="px-4 pb-3 space-y-3 border-t border-slate-100 pt-3">
              {/* Amount tendered */}
              <div>
                <p className="text-[12px] font-medium text-slate-500 mb-1.5">
                  ប្រាក់ទទួលពីអតិថិជន
                </p>
                <div className="flex items-baseline justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-[12px] text-slate-400">ប្រាក់ដៃ</span>
                  <span className="text-[24px] font-extrabold text-slate-900 tabular-nums">
                    {formatKHR(tendered)}
                  </span>
                </div>
              </div>

              {/* Quick-cash chips */}
              <div className="grid grid-cols-3 gap-2">
                {quick.map((amt, i) => {
                  const selected = tendered === amt
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTendered(amt)}
                      className={[
                        'h-12 rounded-lg border text-[13px] font-bold tabular-nums transition-colors',
                        selected
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-700 active:bg-slate-50',
                      ].join(' ')}
                    >
                      {i === 0 ? 'ប្រាក់គត់' : formatKHR(amt)}
                    </button>
                  )
                })}
              </div>

              {/* Change due */}
              <div className="flex items-center justify-between rounded-xl bg-success-50 px-4 py-3">
                <span className="text-[13px] font-medium text-success-700">ប្រាក់អាប់</span>
                <div className="text-right">
                  <span className="block text-[20px] font-extrabold text-success-700 tabular-nums leading-tight">
                    {formatKHR(change > 0 ? change : toKHR(0))}
                  </span>
                  <span className="block text-[12px] font-bold text-success-600 tabular-nums">
                    {formatUSD(change > 0 ? change : toKHR(0))}
                  </span>
                </div>
              </div>
            </div>
          ) : isPartial ? (
            /* ── PARTIAL PAYMENT ─────────────────────────────── */
            <div className="px-4 pb-3 space-y-3 border-t border-slate-100 pt-3">

              {/* Cash portion input */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1.5">
                  💵 ប្រាក់ទូទាត់ឥឡូវ (រៀល)
                </p>
                <div className="flex items-center border border-warning-300 rounded-xl overflow-hidden bg-white focus-within:border-warning-500 focus-within:ring-2 focus-within:ring-warning-400/20">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={partialCash}
                    onChange={(e) => setPartialCash(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="flex-1 h-12 px-4 text-[18px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
                  />
                  <span className="pr-3 text-[14px] text-slate-400">៛</span>
                </div>
                {/* Quick partial chips */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DENOMS.filter(d => d < discountedTotal).slice(0, 5).map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPartialCash(String(amt))}
                      className={[
                        'h-8 px-2.5 rounded-lg border text-[11px] font-semibold tabular-nums transition-colors',
                        partialCashAmt === amt
                          ? 'border-warning-400 bg-warning-50 text-warning-700'
                          : 'border-slate-200 text-slate-600 active:bg-slate-50',
                      ].join(' ')}
                    >
                      {formatKHR(toKHR(amt))}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remaining debt summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-warning-50 border border-warning-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-warning-600 mb-0.5">ទូទាត់ឥឡូវ</p>
                  <p className="text-[16px] font-extrabold text-warning-800 tabular-nums">
                    {formatKHR(partialCashAmt)}
                  </p>
                </div>
                <div className="rounded-xl bg-danger-50 border border-danger-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-danger-600 mb-0.5">នៅជំពាក់</p>
                  <p className="text-[16px] font-extrabold text-danger-700 tabular-nums">
                    {formatKHR(partialDebtAmt)}
                  </p>
                </div>
              </div>

              {/* Customer selector (same as debt mode) */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1.5">
                  អតិថិជន (ស្រេចចិត្ត)
                </p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-xl border border-primary-300 bg-primary-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-200 text-primary-700 flex items-center justify-center text-[13px] font-bold shrink-0">
                        {selectedCustomer.nameKm.charAt(0)}
                      </div>
                      <p className="text-[13px] font-bold text-slate-900">{selectedCustomer.nameKm}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedCustomer(null)}
                      className="shrink-0 w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-1.5">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input type="text" value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="ស្វែងរកឈ្មោះ..."
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-primary-400" />
                    </div>
                    <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                      {allCustomers.length === 0 ? (
                        <p className="px-3 py-3 text-center text-[12px] text-slate-400">ចូល Tab «បំណុល» ដើម្បីបន្ថែម</p>
                      ) : filteredCustomers.map((c) => (
                        <button key={c.id} type="button"
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                          className="w-full flex items-center justify-between px-3 py-2 active:bg-primary-50 text-left">
                          <div className="flex items-center gap-2">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold">
                              {c.nameKm.charAt(0)}
                            </div>
                            <span className="text-[13px] font-semibold text-slate-800">{c.nameKm}</span>
                          </div>
                          {(c.debtBalance as number) > 0 ? (
                            <span className="text-[11px] text-danger-600 tabular-nums">{formatKHR(c.debtBalance)}</span>
                          ) : (
                            <span className="text-[10px] text-success-600">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {discountAmount > 0 && (
                <p className="text-[11px] text-success-600 font-medium">
                  ✓ ទទួលបានបញ្ចុះតម្លៃ {formatKHR(discountAmount)}
                </p>
              )}
            </div>
          ) : (
            <div className="px-4 pb-3 space-y-3 border-t border-slate-100 pt-3">

              {/* Debt amount */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <span className="text-[13px] font-medium text-slate-500">ចំនួនជំពាក់</span>
                <div className="text-right">
                  <span className="block text-[22px] font-extrabold text-slate-900 tabular-nums leading-tight">
                    {formatKHR(discountedTotal)}
                  </span>
                  <span className="block text-[12px] font-bold text-primary-600 tabular-nums">
                    {formatUSD(discountedTotal)}
                  </span>
                </div>
              </div>

              {/* Customer picker */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1.5">
                  អតិថិជន (ស្រេចចិត្ត)
                </p>

                {selectedCustomer ? (
                  /* Selected customer chip */
                  <div className="flex items-center justify-between rounded-xl border border-primary-300 bg-primary-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary-200 text-primary-700 flex items-center justify-center text-[14px] font-bold shrink-0">
                        {selectedCustomer.nameKm.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-slate-900 leading-tight">
                          {selectedCustomer.nameKm}
                        </p>
                        {selectedCustomer.phone && (
                          <p className="text-[11px] text-slate-400">{selectedCustomer.phone}</p>
                        )}
                        {(selectedCustomer.debtBalance as number) > 0 && (
                          <p className="text-[10px] text-danger-600 font-semibold">
                            ជំពាក់ {formatKHR(selectedCustomer.debtBalance)} រួចហើយ
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="shrink-0 w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center active:bg-slate-300"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  /* Search + list */
                  <div>
                    {/* Search bar + quick-add button */}
                    <div className="flex gap-2 mb-1.5">
                      <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => { setCustomerSearch(e.target.value); setShowAddCustomer(false) }}
                          placeholder="ស្វែងរកឈ្មោះ..."
                          className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowAddCustomer(v => !v); setCustomerSearch('') }}
                        className={[
                          'shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-colors',
                          showAddCustomer
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 bg-white text-slate-500 active:bg-slate-50',
                        ].join(' ')}
                        aria-label="បន្ថែមអតិថិជនថ្មី"
                      >
                        <UserPlus size={16} strokeWidth={2.25} />
                      </button>
                    </div>

                    {/* Quick-add form */}
                    {showAddCustomer && (
                      <div className="mb-2 p-3 rounded-xl border border-primary-200 bg-primary-50 space-y-2">
                        <p className="text-[11px] font-bold text-primary-700 flex items-center gap-1">
                          <UserPlus size={11} /> អតិថិជនថ្មី
                        </p>
                        <input
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          placeholder="ឈ្មោះ *"
                          autoFocus
                          className="w-full h-9 px-3 rounded-lg border border-primary-200 bg-white text-[13px] placeholder:text-slate-300 focus:outline-none focus:border-primary-400"
                        />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          placeholder="លេខទូរស័ព្ទ (ស្រេចចិត្ត)"
                          className="w-full h-9 px-3 rounded-lg border border-primary-200 bg-white text-[13px] placeholder:text-slate-300 focus:outline-none focus:border-primary-400"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleQuickAdd}
                            disabled={!newName.trim() || addingCustomer}
                            className="flex-1 h-9 rounded-lg bg-primary-600 text-white font-bold text-[12px] disabled:opacity-50 active:bg-primary-700 transition-colors"
                          >
                            {addingCustomer ? '…' : '+ បន្ថែម'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAddCustomer(false); setNewName(''); setNewPhone('') }}
                            className="px-3 h-9 rounded-lg border border-slate-200 text-slate-500 text-[12px] active:bg-slate-50"
                          >
                            បោះបង់
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                      {allCustomers.length === 0 ? (
                        <p className="px-3 py-4 text-center text-[12px] text-slate-400">
                          ចុច <span className="text-primary-600 font-bold">+</span> ដើម្បីបន្ថែមអតិថិជន
                        </p>
                      ) : filteredCustomers.length === 0 ? (
                        <p className="px-3 py-3 text-center text-[12px] text-slate-400">
                          រកមិនឃើញ «{customerSearch}»
                        </p>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                            className="w-full flex items-center justify-between px-3 py-2.5 active:bg-primary-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={[
                                'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold',
                                (c.debtBalance as number) > 0
                                  ? 'bg-danger-100 text-danger-700'
                                  : 'bg-slate-100 text-slate-500',
                              ].join(' ')}>
                                {c.nameKm.charAt(0)}
                              </div>
                              <span className="text-[13px] font-semibold text-slate-800 truncate">{c.nameKm}</span>
                            </div>
                            {(c.debtBalance as number) > 0 ? (
                              <span className="text-[11px] font-semibold text-danger-600 tabular-nums shrink-0 ml-2">
                                {formatKHR(c.debtBalance)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-success-600 shrink-0 ml-2">✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {discountAmount > 0 && (
                <p className="text-[11px] text-success-600 font-medium">
                  ✓ ទទួលបានបញ្ចុះតម្លៃ {formatKHR(discountAmount)}
                </p>
              )}

              {!selectedCustomer && (
                <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                  <UserCheck size={13} className="shrink-0 mt-0.5" />
                  <span>ជ្រើសអតិថិជន ដើម្បីផ្ទេរបំណុលទៅប្រវត្តិរបស់គាត់ដោយស្វ័យប្រវត្តិ</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Confirm footer ─────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={(isCash && !enough) || (isPartial && !partialValid)}
            onClick={() =>
              onConfirm({
                change:       isCash ? (change > 0 ? change : toKHR(0)) : null,
                customerName: (isDebt || isPartial) && selectedCustomer ? selectedCustomer.nameKm : null,
                customerId:   (isDebt || isPartial) && selectedCustomer ? selectedCustomer.id as CustomerId : null,
                discount:     discountAmount,
                partialDebt:  isPartial ? partialDebtAmt : null,
              })
            }
            className={[
              'w-full h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-[16px]',
              'transition-all active:scale-[0.99]',
              isCash    ? 'bg-success-600 text-white active:bg-success-700 shadow-lg shadow-success-600/25'
              : isPartial ? 'bg-warning-600 text-white active:bg-warning-700 shadow-lg shadow-warning-600/25'
              : 'bg-slate-900 text-white active:bg-slate-800',
              'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
            ].join(' ')}
          >
            {isCash    ? <Banknote size={20} strokeWidth={2.25} />
            : isPartial ? <SplitSquareHorizontal size={20} strokeWidth={2.25} />
            : <NotebookPen size={20} strokeWidth={2.25} />}
            {isCash ? 'បញ្ជាក់ការទូទាត់' : isPartial ? 'ទូទាត់ + ជំពាក់' : 'កត់ត្រាបំណុល'}
          </button>
          {isCash && !enough && (
            <p className="text-center text-[11px] text-danger-600 mt-2">
              ប្រាក់ទទួលតិចជាងសរុប
            </p>
          )}
          {isPartial && !partialValid && partialCash !== '' && (
            <p className="text-center text-[11px] text-warning-600 mt-2">
              វាយចំនួនប្រាក់ (ច្រើនជា 0 និងតិចជាសរុប)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
