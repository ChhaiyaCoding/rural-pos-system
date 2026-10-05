'use client'

import { useState, useMemo } from 'react'
import { X, Banknote, NotebookPen, Tag, Search, UserCheck, SplitSquareHorizontal, UserPlus, Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useSaleStore } from '@/store/sale.store'
import { customerService } from '@/services/customer.service'
import { formatKHR, formatUSD, subtractKHR, multiplyKHR, toKHR, addKHR } from '@/lib/money'
import { useStoreProfile } from '@/store/storeProfile.store'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MoneyText } from '@/components/ui/MoneyText'
import { NumericPad } from '@/components/ui/NumericPad'
import { LetterAvatar } from '@/components/ui/LetterAvatar'
import { cx } from '@/components/ui/cx'
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
const USD_NOTES      = [1, 5, 10, 20, 50, 100]

export function CheckoutSheet({ type, onClose, onConfirm }: CheckoutSheetProps) {
  const cart  = useSaleStore((s) => s.cart)
  const total = useSaleStore((s) => s.cartTotal)()
  const count = useSaleStore((s) => s.cartCount)()
  const exchangeRate = useStoreProfile((s) => s.exchangeRate)

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
    // Reset tendered to new exact amount (in ៛)
    setTenderCurrency('KHR')
    setTenderInput(String(subtractKHR(total, clamped)))
  }

  /* Discounted total ─────────────────────────────────────────── */
  const discountedTotal = Math.max(total - discountAmount, 0) as KHR

  /* Cash: amount tendered — typeable in ៛ or $ ───────────────── */
  const [tenderCurrency, setTenderCurrency] = useState<'KHR' | 'USD'>('KHR')
  const [tenderInput,    setTenderInput]    = useState<string>(String(total))
  const tendered = (tenderCurrency === 'USD'
    ? Math.round((Number(tenderInput) || 0) * exchangeRate)
    : Math.round(Number(tenderInput) || 0)) as KHR
  const change = subtractKHR(tendered, discountedTotal)
  const enough = tendered >= discountedTotal

  /* Partial: cash portion paid now — typeable in ៛ or $ ───────── */
  const [partialCash,     setPartialCash]     = useState<string>('')
  const [partialCurrency, setPartialCurrency] = useState<'KHR' | 'USD'>('KHR')
  const partialCashKhr  = partialCurrency === 'USD'
    ? Math.round((Number(partialCash) || 0) * exchangeRate)
    : Math.round(Number(partialCash) || 0)
  const partialCashAmt  = Math.max(0, Math.min(partialCashKhr, discountedTotal)) as KHR
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
    <Sheet
      open
      onClose={onClose}
      size="full"
      tone="bg"
      title={isCash ? 'ទូទាត់សាច់ប្រាក់' : isPartial ? 'បង់ខ្លះ + ជំពាក់' : 'ជំពាក់ — បង់ក្រោយ'}
      subtitle={`${count} មុខ`}
      footer={
        <div>
          {/* Change due — always visible above the action (no scrolling needed) */}
          {isCash && (
            <div className="mb-2.5 flex items-center justify-between gap-3 rounded-md bg-success-bg px-4 py-2.5 text-success">
              <span className="text-body-sm font-semibold">ប្រាក់អាប់</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="text-title font-bold">
                  {formatKHR(change > 0 ? change : toKHR(0))}
                </span>
                <span className="text-body-sm font-semibold">
                  {formatUSD(change > 0 ? change : toKHR(0))}
                </span>
              </span>
            </div>
          )}
          <Button
            variant="dark"
            size="xl"
            fullWidth
            disabled={(isCash && !enough) || (isPartial && !partialValid) || ((isDebt || isPartial) && !selectedCustomer)}
            onClick={() =>
              onConfirm({
                change:       isCash ? (change > 0 ? change : toKHR(0)) : null,
                customerName: (isDebt || isPartial) && selectedCustomer ? selectedCustomer.nameKm : null,
                customerId:   (isDebt || isPartial) && selectedCustomer ? selectedCustomer.id as CustomerId : null,
                discount:     discountAmount,
                partialDebt:  isPartial ? partialDebtAmt : null,
              })
            }
            icon={<Check size={22} strokeWidth={2.75} className="text-accent" />}
          >
            បញ្ចប់ការលក់
          </Button>
          {isCash && !enough && (
            <p className="mt-2 text-center text-meta font-semibold text-danger">
              ប្រាក់ទទួលតិចជាងសរុប
            </p>
          )}
          {isPartial && !partialValid && partialCash !== '' && (
            <p className="mt-2 text-center text-meta font-semibold text-warn">
              វាយចំនួនប្រាក់ (ច្រើនជា 0 និងតិចជាសរុប)
            </p>
          )}
          {(isDebt || isPartial) && !selectedCustomer && (
            <p className="mt-2 text-center text-meta font-semibold text-danger">
              សូម​ជ្រើស​អតិថិជន​សិន (ឬ​បង្កើត​ថ្មី) ទើប​កត់​បំណុល​បាន
            </p>
          )}
        </div>
      }
    >
      <div className="pb-2 pt-1 md:grid md:grid-cols-2 md:items-start md:gap-4">

        {/* ── Left: amount due + items + discount ────────────── */}
        <div className="space-y-3">

          {/* Payment type + amount due */}
          <div className="rounded-lg bg-ink-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-ink-900" aria-hidden="true">
                {isCash    ? <Banknote size={24} strokeWidth={2.25} />
                : isPartial ? <SplitSquareHorizontal size={24} strokeWidth={2.25} />
                : <NotebookPen size={24} strokeWidth={2.25} />}
              </span>
              <div className="min-w-0">
                <p className="text-meta text-ink-300">របៀបទូទាត់</p>
                <p className="text-body font-bold">{isCash ? 'សាច់ប្រាក់' : isPartial ? 'បង់ខ្លះ' : 'ជំពាក់'}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-ink-700 pt-3">
              <p className="text-meta font-semibold text-ink-300">
                {isDebt ? 'ចំនួនជំពាក់' : 'ត្រូវបង់'}
                {discountAmount > 0 && (
                  <span className="ml-2 tabular-nums line-through">{formatKHR(total)}</span>
                )}
              </p>
              <MoneyText amount={discountedTotal} size="xl" tone="onDark" />
              {discountAmount > 0 && (
                <p className="mt-1 text-meta font-semibold tabular-nums text-accent">
                  បញ្ចុះ −{formatKHR(discountAmount)}
                </p>
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="rounded-lg bg-surface px-4 py-3">
            <p className="text-meta font-semibold text-text-subtle">
              បញ្ជីទំនិញ ({count})
            </p>
            <div className="divide-y divide-line">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-body-sm text-text">
                    {item.product.nameKm}
                    <span className="tabular-nums text-text-muted"> × {item.qty}</span>
                  </span>
                  <span className="shrink-0 text-body-sm font-semibold tabular-nums text-text">
                    {formatKHR(multiplyKHR(item.unitPrice, item.qty))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Discount toggle + section */}
          {!showDiscount ? (
            <button
              type="button"
              onClick={() => setShowDiscount(true)}
              className="flex h-12 w-full items-center gap-2 rounded-lg bg-surface px-4 text-body-sm font-semibold text-text transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              <Tag size={18} strokeWidth={2.25} aria-hidden="true" />
              ដាក់បញ្ចុះតម្លៃ
            </button>
          ) : (
            <div className="space-y-2.5 rounded-lg bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-body-sm font-semibold text-text">
                  <Tag size={18} strokeWidth={2.25} aria-hidden="true" />
                  បញ្ចុះតម្លៃ (រៀល)
                </p>
                <button
                  type="button"
                  onClick={() => { setShowDiscount(false); applyDiscount(toKHR(0)) }}
                  className="h-12 rounded-sm px-3 text-meta font-semibold text-text-subtle transition-colors active:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                >
                  លុបចោល ×
                </button>
              </div>

              {/* Preset discount chips */}
              <div className="grid grid-cols-4 gap-2">
                {DISCOUNT_CHIPS.map((chip) => {
                  const val = toKHR(chip)
                  const active = discountAmount === val
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => applyDiscount(val)}
                      aria-pressed={active}
                      className={cx(
                        'h-12 rounded-sm text-meta font-bold tabular-nums transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                        active ? 'bg-ink-900 text-white' : 'bg-bg text-text active:bg-line',
                      )}
                    >
                      {formatKHR(val)}
                    </button>
                  )
                })}
              </div>

              {/* Free-form discount input */}
              <div className="flex min-h-12 items-center rounded-[18px] bg-bg px-4 focus-within:ring-2 focus-within:ring-ink-900/20">
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
                  aria-label="បញ្ចុះតម្លៃ (រៀល)"
                  className="h-12 min-w-0 flex-1 bg-transparent text-body font-semibold text-text outline-none placeholder:font-normal placeholder:text-text-muted"
                />
                <span className="shrink-0 text-body font-bold text-text-subtle">៛</span>
              </div>
            </div>
          )}

          {discountAmount > 0 && (isDebt || isPartial) && (
            <p className="px-1 text-meta font-semibold text-success">
              ✓ ទទួលបានបញ្ចុះតម្លៃ {formatKHR(discountAmount)}
            </p>
          )}
        </div>

        {/* ── Right: amount received / customer ─────────────── */}
        <div className="mt-3 space-y-3 md:mt-0">

          {isCash && (
            /* ── CASH: amount tendered — typeable in ៛ or $ ─────── */
            <div className="space-y-3 rounded-lg bg-ink-900 p-4 text-white">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="checkout-tender" className="text-body-sm font-semibold text-ink-300">
                  ប្រាក់ទទួលពីអតិថិជន
                </label>
                {tenderInput !== '' && (
                  <button
                    type="button"
                    onClick={() => setTenderInput('')}
                    className="h-12 rounded-sm px-3 text-meta font-semibold text-ink-300 transition-colors active:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    សម្អាត ×
                  </button>
                )}
              </div>

              {/* ៛ / $ toggle */}
              <SegmentedControl
                tone="dark"
                ariaLabel="រូបិយប័ណ្ណប្រាក់ទទួល"
                items={[
                  { value: 'KHR', label: '៛ រៀល' },
                  { value: 'USD', label: '$ ដុល្លារ' },
                ]}
                value={tenderCurrency}
                onChange={(cur) => { setTenderCurrency(cur); setTenderInput('') }}
              />

              <div className="flex items-center gap-2 rounded-[18px] bg-ink-800 px-4 focus-within:ring-2 focus-within:ring-accent/60">
                <span className="shrink-0 text-title-sm font-bold text-ink-300">
                  {tenderCurrency === 'USD' ? '$' : '៛'}
                </span>
                <input
                  id="checkout-tender"
                  type="number"
                  inputMode={tenderCurrency === 'USD' ? 'decimal' : 'none'}
                  value={tenderInput}
                  onChange={(e) => setTenderInput(e.target.value)}
                  placeholder="0"
                  className="h-16 min-w-0 flex-1 bg-transparent text-right text-amount-lg font-bold tabular-nums text-white outline-none placeholder:text-ink-300"
                />
              </div>
              {tendered > 0 && (
                <p className="text-right text-meta font-semibold tabular-nums text-ink-300">
                  {tenderCurrency === 'USD'
                    ? `= ${formatKHR(tendered)}`
                    : `≈ ${formatUSD(tendered)}`}
                </p>
              )}

              {/* Quick-cash — currency-aware */}
              {tenderCurrency === 'KHR' ? (
                <div className="grid grid-cols-3 gap-2">
                  {quick.map((amt, i) => {
                    const selected = Number(tenderInput) === amt
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setTenderCurrency('KHR'); setTenderInput(String(amt)) }}
                        aria-pressed={selected}
                        className={cx(
                          'h-12 rounded-sm text-body-sm font-bold tabular-nums transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                          selected ? 'bg-accent text-ink-900' : 'bg-ink-800 text-white active:bg-ink-700',
                        )}
                      >
                        {i === 0 ? 'ប្រាក់គត់' : formatKHR(amt)}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {USD_NOTES.map((usd) => {
                    const selected = Number(tenderInput) === usd
                    return (
                      <button
                        key={usd}
                        type="button"
                        onClick={() => { setTenderCurrency('USD'); setTenderInput(String(usd)) }}
                        aria-pressed={selected}
                        className={cx(
                          'flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                          selected ? 'bg-accent text-ink-900' : 'bg-ink-800 text-white active:bg-ink-700',
                        )}
                      >
                        <span className="text-body font-bold tabular-nums">${usd}</span>
                        <span className={cx('text-caption font-semibold tabular-nums', selected ? 'text-ink-900' : 'text-ink-300')}>
                          {formatKHR(toKHR(usd * exchangeRate))}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <NumericPad tone="dark" value={tenderInput} onChange={setTenderInput} />
            </div>
          )}

          {isPartial && (
            <>
              {/* ── PARTIAL: cash portion paid now — payable in ៛ or $ ── */}
              <div className="space-y-3 rounded-lg bg-ink-900 p-4 text-white">
                <label htmlFor="checkout-partial" className="block text-body-sm font-semibold text-ink-300">
                  បង់ឥឡូវ
                </label>

                <SegmentedControl
                  tone="dark"
                  ariaLabel="រូបិយប័ណ្ណប្រាក់បង់ឥឡូវ"
                  items={[
                    { value: 'KHR', label: '៛ រៀល' },
                    { value: 'USD', label: '$ ដុល្លារ' },
                  ]}
                  value={partialCurrency}
                  onChange={(cur) => { setPartialCurrency(cur); setPartialCash('') }}
                />

                <div className="flex items-center gap-2 rounded-[18px] bg-ink-800 px-4 focus-within:ring-2 focus-within:ring-accent/60">
                  <span className="shrink-0 text-title-sm font-bold text-ink-300">
                    {partialCurrency === 'USD' ? '$' : '៛'}
                  </span>
                  <input
                    id="checkout-partial"
                    type="number"
                    inputMode={partialCurrency === 'USD' ? 'decimal' : 'none'}
                    value={partialCash}
                    onChange={(e) => setPartialCash(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="h-16 min-w-0 flex-1 bg-transparent text-right text-amount-lg font-bold tabular-nums text-white outline-none placeholder:text-ink-300"
                  />
                </div>
                {partialCurrency === 'USD' && partialCashAmt > 0 && (
                  <p className="text-right text-meta font-semibold tabular-nums text-ink-300">
                    = {formatKHR(partialCashAmt)}
                  </p>
                )}

                {/* Quick partial chips — currency-aware */}
                <div className="flex flex-wrap gap-2">
                  {partialCurrency === 'KHR'
                    ? DENOMS.filter(d => d < discountedTotal).slice(0, 5).map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPartialCash(String(amt))}
                          aria-pressed={Number(partialCash) === amt}
                          className={cx(
                            'h-12 rounded-sm px-3 text-body-sm font-bold tabular-nums transition-colors',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                            Number(partialCash) === amt ? 'bg-accent text-ink-900' : 'bg-ink-800 text-white active:bg-ink-700',
                          )}
                        >
                          {formatKHR(toKHR(amt))}
                        </button>
                      ))
                    : USD_NOTES.filter(u => u * exchangeRate < discountedTotal).map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setPartialCash(String(u))}
                          aria-pressed={Number(partialCash) === u}
                          className={cx(
                            'h-12 rounded-sm px-4 text-body-sm font-bold tabular-nums transition-colors',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                            Number(partialCash) === u ? 'bg-accent text-ink-900' : 'bg-ink-800 text-white active:bg-ink-700',
                          )}
                        >
                          ${u}
                        </button>
                      ))
                  }
                </div>

                <NumericPad tone="dark" value={partialCash} onChange={setPartialCash} />
              </div>

              {/* Remaining debt summary */}
              <div className="divide-y divide-warn/20 rounded-lg bg-warn-bg px-4 text-warn">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-body-sm font-semibold">ទូទាត់ឥឡូវ</span>
                  <span className="text-body font-bold tabular-nums">{formatKHR(partialCashAmt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-body-sm font-semibold">នៅជំពាក់</span>
                  <span className="text-title-sm font-bold tabular-nums">{formatKHR(partialDebtAmt)}</span>
                </div>
                {selectedCustomer && (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-body-sm font-semibold">ជំពាក់សរុបថ្មី</span>
                    <span className="text-body font-bold tabular-nums">
                      {formatKHR(addKHR(selectedCustomer.debtBalance, partialDebtAmt))}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {(isDebt || isPartial) && (
            /* ── Customer picker (debt + partial) ─────────────── */
            <div className="rounded-lg bg-surface p-4">
              <p className="mb-2 text-body-sm font-semibold text-text">
                អតិថិជន​ដែល​ជំពាក់ <span className="text-danger">*</span>
              </p>

              {selectedCustomer ? (
                /* Selected customer card */
                <div className="flex items-center gap-3 rounded-md bg-bg p-3">
                  <LetterAvatar
                    name={selectedCustomer.nameKm}
                    status={(selectedCustomer.debtBalance as number) > 0 ? 'overdue' : 'neutral'}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-bold text-text">
                      {selectedCustomer.nameKm}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-meta text-text-muted">{selectedCustomer.phone}</p>
                    )}
                    {(selectedCustomer.debtBalance as number) > 0 && (
                      <p className="text-meta font-semibold tabular-nums text-debt">
                        ជំពាក់ស្រាប់ {formatKHR(selectedCustomer.debtBalance)}
                      </p>
                    )}
                  </div>
                  <IconButton aria-label="ដកអតិថិជនចេញ" variant="light" onClick={() => setSelectedCustomer(null)}>
                    <X size={20} strokeWidth={2.25} />
                  </IconButton>
                </div>
              ) : (
                /* Search + list */
                <div>
                  {/* Search bar + quick-add button */}
                  <div className="mb-2 flex gap-2">
                    <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md bg-bg px-3 focus-within:ring-2 focus-within:ring-ink-900/20">
                      <Search size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowAddCustomer(false) }}
                        placeholder="ស្វែងរកឈ្មោះ..."
                        aria-label="ស្វែងរកអតិថិជន"
                        className="h-full min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-muted"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowAddCustomer(v => !v); setCustomerSearch('') }}
                      aria-pressed={showAddCustomer}
                      className={cx(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-md transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                        showAddCustomer ? 'bg-ink-900 text-white' : 'bg-bg text-text active:bg-line',
                      )}
                      aria-label="បន្ថែមអតិថិជនថ្មី"
                    >
                      <UserPlus size={20} strokeWidth={2.25} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Quick-add form */}
                  {showAddCustomer && (
                    <div className="mb-2 space-y-2 rounded-md bg-bg p-3">
                      <p className="flex items-center gap-1.5 text-meta font-bold text-text">
                        <UserPlus size={16} aria-hidden="true" /> អតិថិជនថ្មី
                      </p>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="ឈ្មោះ *"
                        aria-label="ឈ្មោះ"
                        autoFocus
                        className="h-12 w-full rounded-sm bg-surface px-3 text-body text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-ink-900/20"
                      />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        placeholder="លេខទូរស័ព្ទ (ស្រេចចិត្ត)"
                        aria-label="លេខទូរស័ព្ទ"
                        className="h-12 w-full rounded-sm bg-surface px-3 text-body text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-ink-900/20"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="dark"
                          className="flex-1"
                          onClick={handleQuickAdd}
                          disabled={!newName.trim() || addingCustomer}
                        >
                          {addingCustomer ? '…' : '+ បន្ថែម'}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => { setShowAddCustomer(false); setNewName(''); setNewPhone('') }}
                        >
                          បោះបង់
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="max-h-60 divide-y divide-line overflow-y-auto rounded-md bg-bg">
                    {allCustomers.length === 0 ? (
                      <p className="px-3 py-4 text-center text-meta text-text-muted">
                        ចុច <span className="font-bold text-text">+</span> ដើម្បីបន្ថែមអតិថិជន
                      </p>
                    ) : filteredCustomers.length === 0 ? (
                      <p className="px-3 py-3 text-center text-meta text-text-muted">
                        រកមិនឃើញ «{customerSearch}»
                      </p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                          className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors active:bg-line focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink-900"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <LetterAvatar
                              name={c.nameKm}
                              status={(c.debtBalance as number) > 0 ? 'overdue' : 'neutral'}
                              size={40}
                            />
                            <span className="truncate text-body-sm font-semibold text-text">{c.nameKm}</span>
                          </span>
                          {(c.debtBalance as number) > 0 ? (
                            <span className="shrink-0 text-meta font-semibold tabular-nums text-debt">
                              {formatKHR(c.debtBalance)}
                            </span>
                          ) : (
                            <span className="shrink-0 text-meta font-bold text-success" aria-hidden="true">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {isDebt && !selectedCustomer && (
                <div className="mt-2 flex items-start gap-2 text-meta text-text-muted">
                  <UserCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>ជ្រើសអតិថិជន ដើម្បីផ្ទេរបំណុលទៅប្រវត្តិរបស់គាត់ដោយស្វ័យប្រវត្តិ</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
