'use client'

import { useState, useMemo, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { X, Phone, MapPin, ArrowUpRight, Banknote, Pencil, CheckCircle2, ChevronLeft, ImageDown, Check, CalendarClock, Receipt, Trash2, Wallet, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { debtService, DEBT_METHODS, debtMethodLabel } from '@/services/debt.service'
import { customerService } from '@/services/customer.service'
import { formatKHR, formatUSD, toKHR, getExchangeRate } from '@/lib/money'
import { formatDateKm, formatDateTimeKm, nowISO, todayISODate, addDaysISODate } from '@/lib/date'
import { getDueInfo } from '@/lib/dueDate'
import { useStoreProfile } from '@/store/storeProfile.store'
import { CustomerEditSheet } from './CustomerEditSheet'
import { ReprintReceipt } from '@/features/sales/components/ReprintReceipt'
import { reconcileDebtItems, type DebtItem } from '../reconcile'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatTile } from '@/components/ui/StatTile'
import { MoneyText } from '@/components/ui/MoneyText'
import { LetterAvatar } from '@/components/ui/LetterAvatar'
import { Pill } from '@/components/ui/Pill'
import { Input } from '@/components/ui/Input'
import { cx } from '@/components/ui/cx'
import type { Customer, Sale, DebtPaymentMethod } from '@/types'
import type { TenantId, CustomerId, KHR, UUID } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  customer: Customer
  onClose: () => void
}

/* ── Swipe-to-delete row (iOS style) ──────────────────────────
   Swipe a payment left to reveal a red "លុប" button; tap it to void. */
const VOID_ACTION_W = 96

function SwipeRow({
  open, onOpen, onClose, onVoid, voiding, children,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onVoid: () => void
  voiding: boolean
  children: ReactNode
}) {
  const [drag, setDrag] = useState(0)
  const dragRef = useRef(0)                         // live value for gesture-end (avoids stale closure)
  const start = useRef<{ x: number; y: number } | null>(null)
  const dir   = useRef<'h' | 'v' | null>(null)
  const moved = useRef(false)

  const base = open ? -VOID_ACTION_W : 0
  const tx   = Math.max(-VOID_ACTION_W, Math.min(0, base + drag))

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY }
    dir.current = null
    moved.current = false
    dragRef.current = 0
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (dir.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      dir.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (dir.current === 'h') {
      moved.current = true
      dragRef.current = dx
      setDrag(dx)
    }
  }
  const up = () => {
    if (dir.current === 'h') {
      const finalX = base + dragRef.current
      if (finalX < -VOID_ACTION_W / 2) onOpen()
      else onClose()
    }
    dragRef.current = 0
    setDrag(0)
    start.current = null
    dir.current = null
  }
  const onFgClick = () => {
    if (moved.current) { moved.current = false; return }  // ignore tap that ended a swipe
    if (open) onClose()
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-bg">
      {/* Reveal action — floating rounded button (matches the rounded-card design) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center py-1.5 pr-3 pl-1"
        style={{ width: VOID_ACTION_W }}
      >
        <button
          type="button"
          disabled={voiding}
          onClick={onVoid}
          aria-label="លុបការសង"
          className="w-full h-full rounded-md bg-danger text-white flex flex-col items-center justify-center gap-1 active:brightness-95 disabled:opacity-60 transition-[filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          <Trash2 size={18} strokeWidth={2.25} aria-hidden="true" />
          <span className="text-caption font-bold leading-none">លុប</span>
        </button>
      </div>

      {/* Foreground (slides) */}
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={onFgClick}
        style={{
          transform: `translateX(${tx}px)`,
          transition: drag === 0 ? 'transform 0.2s ease' : 'none',
          touchAction: 'pan-y',
        }}
        className="relative rounded-lg bg-surface"
      >
        {children}
      </div>
    </div>
  )
}

export function CustomerDetailSheet({ customer, onClose }: Props) {
  const [payMethod,   setPayMethod]   = useState<DebtPaymentMethod>('cash')
  const [payNote,     setPayNote]     = useState('')
  const [paying,      setPaying]      = useState(false)
  const [showPay,     setShowPay]     = useState(false)
  const [showOb,      setShowOb]      = useState(false)
  const [obAmount,    setObAmount]    = useState('')
  const [obCurrency,  setObCurrency]  = useState<'KHR' | 'USD'>('KHR')
  const [obNote,      setObNote]      = useState('')
  const [obDate,      setObDate]      = useState(todayISODate())
  const [savingOb,    setSavingOb]    = useState(false)
  const [reprintSale, setReprintSale] = useState<Sale | null>(null)
  const [openVoidId,  setOpenVoidId]  = useState<string | null>(null)
  const [pendingVoid, setPendingVoid] = useState<{ id: string; amount: KHR; kind: 'payment' | 'opening' } | null>(null)
  const [pendingPay,  setPendingPay]  = useState<DebtItem | null>(null)
  const [voiding,     setVoiding]     = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [paySuccess,  setPaySuccess]  = useState<{ paid: KHR; after: KHR } | null>(null)
  const [capturing,   setCapturing]   = useState(false)
  const [shareOk,     setShareOk]     = useState(false)
  const statementRef = useRef<HTMLDivElement>(null)

  const { storeName, storePhone, receiptShowPhone } = useStoreProfile()

  /* Live customer (balance updates in real-time) */
  const live = useLiveQuery(
    () => db.customers.get(customer.id),
    [customer.id]
  ) ?? customer

  /* Debt transaction ledger — sorted newest first */
  const txns = useLiveQuery(
    () => debtService.getLedger(DEMO_TENANT, customer.id as CustomerId),
    [customer.id]
  ) ?? []

  /* Debt invoices = this customer's debt/partial sales (newest first) */
  const sales = useLiveQuery(
    () => db.sales
      .where('tenantId').equals(DEMO_TENANT)
      .filter((s) => s.customerId === customer.id && !s.isVoid && (s.paymentType === 'debt' || s.paymentType === 'partial'))
      .toArray(),
    [customer.id]
  ) ?? []
  /* Summary + payment history derived from the ledger */
  const totalCharged = toKHR(txns.filter((t) => t.type === 'charge').reduce((s, t) => s + (t.amount as number), 0))
  const totalPaid    = toKHR(txns.filter((t) => t.type === 'payment').reduce((s, t) => s + (t.amount as number), 0))
  const payments     = useMemo(() => txns.filter((t) => t.type === 'payment'), [txns])  // newest first

  /* Debt items with reconciled outstanding — unifies sale invoices AND
     opening-balance charges. Each payment closes exactly one item (appliesToId);
     legacy pooled payments fall back to FIFO. Σ(currentRemaining) === debtBalance. */
  const debtItems = useMemo(() => reconcileDebtItems(sales, txns), [sales, txns])
  /* Open (unsettled) items, for the per-invoice payment picker. */
  const openItems = useMemo(() => debtItems.filter((it) => it.currentRemaining > 0), [debtItems])

  /* Running balance — compute from oldest → newest, then reverse for display */
  const txnsWithBalance = useMemo(() => {
    const asc = [...txns].reverse()        // oldest first
    let bal = 0
    const tagged = asc.map((t) => {
      bal = t.type === 'charge' ? bal + t.amount : bal - t.amount
      return { ...t, runningBalance: Math.max(0, bal) as KHR }
    })
    return tagged.reverse()               // newest first for display
  }, [txns])

  const hasDebt = live.debtBalance > 0

  /* ── Due date ──────────────────────────────────────────── */
  const [savingDue, setSavingDue] = useState(false)
  const dueInfo = getDueInfo(live)
  const handleSetDue = async (date: string | null) => {
    if (savingDue) return
    setSavingDue(true)
    await customerService.setDueDate(live.id as CustomerId, date)
    setSavingDue(false)
  }
  const dueBadge =
    dueInfo.status === 'overdue'  ? { text: 'ផុតកំណត់', cls: 'bg-danger-100 text-danger-700' }
    : dueInfo.status === 'due-soon' ? { text: 'ជិតដល់',  cls: 'bg-warning-100 text-warning-700' }
    : dueInfo.status === 'upcoming' ? { text: 'មានពេល',  cls: 'bg-success-100 text-success-700' }
    : null
  const dueText =
    dueInfo.daysUntilDue === null ? ''
    : dueInfo.daysUntilDue < 0  ? `ផុតកំណត់ ${-dueInfo.daysUntilDue} ថ្ងៃ`
    : dueInfo.daysUntilDue === 0 ? 'ត្រូវសងថ្ងៃនេះ'
    : `នៅសល់ ${dueInfo.daysUntilDue} ថ្ងៃ`

  /* Exchange rate — used by the manual-debt form's $ input. */
  const rate = getExchangeRate()

  /* ── Handle payment — settles exactly one invoice in full ───── */
  const handlePayInvoice = async (item: DebtItem) => {
    if (paying) return
    const amt = item.currentRemaining
    if (amt <= 0) return
    setPaying(true)
    try {
      const result = await debtService.recordPayment({
        tenantId:    DEMO_TENANT,
        customerId:  customer.id as CustomerId,
        amount:      toKHR(amt) as KHR,
        method:      payMethod,
        appliesToId: item.id,
        ...(payNote.trim() ? { note: payNote.trim() } : {}),
      })
      if (result.ok) {
        const after = Math.max(0, live.debtBalance - amt) as KHR
        setPaySuccess({ paid: toKHR(amt) as KHR, after })
        setPayNote('')
        setPendingPay(null)
        // Close the picker once nothing is left to settle; otherwise keep it open.
        if (openItems.filter((it) => it.id !== item.id).length === 0) setShowPay(false)
      }
    } finally {
      setPaying(false)
    }
  }

  /* ── Dismiss success banner after 4 s ───────────────── */
  const dismissSuccess = () => setPaySuccess(null)

  /* ── Confirm a pending void — payment (restore balance) or opening debt (remove) ─── */
  const handleConfirmVoid = async () => {
    if (voiding || !pendingVoid) return
    setVoiding(true)
    try {
      const result = pendingVoid.kind === 'payment'
        ? await debtService.voidPayment({ tenantId: DEMO_TENANT, paymentId: pendingVoid.id as UUID })
        : await debtService.voidManualCharge({ tenantId: DEMO_TENANT, chargeId: pendingVoid.id as UUID })
      if (result.ok) { setPendingVoid(null); setOpenVoidId(null) }
    } finally {
      setVoiding(false)
    }
  }

  /* ── Manual debt (new debt now, or old/opening balance) ──── */
  const obParsed = Number(obAmount) || 0
  const obKhr    = obCurrency === 'USD' ? Math.round(obParsed * rate) : Math.round(obParsed)
  const canAddOb = obKhr > 0 && !savingOb

  const openObForm = () => {
    setShowOb(true); setObAmount(''); setObNote(''); setObDate(todayISODate()); setShowPay(false)
  }
  const closeObForm = () => { setShowOb(false); setObAmount(''); setObNote('') }

  const handleAddDebt = async () => {
    if (!canAddOb) return
    setSavingOb(true)
    try {
      const result = await debtService.addManualDebt({
        tenantId:   DEMO_TENANT,
        customerId: customer.id as CustomerId,
        amount:     toKHR(obKhr) as KHR,
        kind:       'manual',
        ...(obNote.trim() ? { note: obNote.trim() } : {}),
        // Dated by the picker (defaults to today; pick a past date for old debt)
        ...(obDate ? { createdAt: new Date(`${obDate}T12:00:00`).toISOString() } : {}),
      })
      if (result.ok) closeObForm()
    } finally {
      setSavingOb(false)
    }
  }

  /* ── Share debt statement as image ──────────────────── */
  const handleShareStatement = async () => {
    if (!statementRef.current || capturing) return
    setCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(statementRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const fileName = `debt-${live.nameKm}-${nowISO().slice(0,10)}.png`

      if (navigator.canShare) {
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
        )
        const file = new File([blob], fileName, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `សេចក្ដីសង្ខេបបំណុល — ${live.nameKm}` })
          setShareOk(true)
          setTimeout(() => setShareOk(false), 2500)
          return
        }
      }
      // Fallback: download
      const link = document.createElement('a')
      link.download = fileName
      link.href = canvas.toDataURL('image/png')
      link.click()
      setShareOk(true)
      setTimeout(() => setShareOk(false), 2500)
    } catch { /* silent */ }
    finally { setCapturing(false) }
  }

  /* ─────────────────────────────────────────────────────── */
  return (
    <>
      <Sheet
        open
        onClose={onClose}
        size="full"
        tone="bg"
        hideClose
        ariaLabel="ព័ត៌មានអតិថិជន"
        bodyClassName="pb-6"
        footer={
          <Button variant="dashed" size="lg" fullWidth icon={<Plus size={20} strokeWidth={2.5} />} onClick={openObForm}>
            បន្ថែម​បំណុល
          </Button>
        }
      >
        {/* ── Hero ─────────────────────────────────────── */}
        <div className="rounded-b-2xl bg-ink-900 px-4 pb-5 pt-3 text-white md:px-6">
          <div className="flex items-center gap-2">
            <IconButton aria-label="ត្រឡប់ក្រោយ" variant="onDark" onClick={onClose}>
              <ChevronLeft size={22} strokeWidth={2.25} />
            </IconButton>
            <p className="min-w-0 flex-1 truncate text-body font-semibold text-ink-300">ព័ត៌មានអតិថិជន</p>
            {/* Share statement as image */}
            <IconButton
              aria-label={capturing ? 'កំពុងបង្កើតរូប…' : shareOk ? 'ចែករំលែករួចរាល់' : 'ចែករំលែកបំណុល'}
              variant="onDark"
              onClick={handleShareStatement}
              disabled={capturing}
            >
              {capturing ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink-300 border-t-transparent" />
              ) : shareOk ? (
                <Check size={20} strokeWidth={2.5} className="text-success-on-dark" />
              ) : (
                <ImageDown size={20} strokeWidth={2.25} />
              )}
            </IconButton>
            <IconButton aria-label="កែប្រែ" variant="onDark" onClick={() => setEditing(true)}>
              <Pencil size={20} strokeWidth={2.25} />
            </IconButton>
          </div>

          {/* Profile */}
          <div className="mt-4 flex items-center gap-4">
            <LetterAvatar
              name={live.nameKm}
              imageUri={live.imageUri}
              status={dueInfo.status === 'overdue' ? 'overdue' : dueInfo.status === 'due-soon' ? 'dueToday' : 'neutral'}
              size={60}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-title font-bold text-white">{live.nameKm}</p>
              {live.phone && (
                <p className="mt-0.5 flex items-center gap-1.5 text-meta text-ink-300">
                  <Phone size={14} className="shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">{live.phone}</span>
                </p>
              )}
              {live.address && (
                <p className="mt-0.5 flex items-start gap-1.5 text-meta text-ink-300">
                  <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{live.address}</span>
                </p>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="mt-4">
            <p className="text-meta font-semibold text-ink-300">ជំពាក់សរុប</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <MoneyText amount={live.debtBalance} size="xl" tone={hasDebt ? 'debtOnDark' : 'successOnDark'} />
              {hasDebt && dueBadge && (
                <Pill variant={dueInfo.status === 'overdue' ? 'dangerSolid' : dueInfo.status === 'due-soon' ? 'warnSolid' : 'success'}>
                  {dueBadge.text}
                </Pill>
              )}
            </div>
          </div>

          {/* ─ Due date (repayment deadline) ─────────── */}
          {hasDebt && (
            <div className="mt-4 rounded-lg bg-ink-800 p-3">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="customer-due" className="flex items-center gap-1.5 text-meta font-semibold text-ink-300">
                  <CalendarClock size={16} strokeWidth={2.25} aria-hidden="true" /> ថ្ងៃកំណត់សង
                </label>
                {live.dueDate && (
                  <p className="text-meta tabular-nums">
                    <span className={cx(
                      'font-bold',
                      dueInfo.status === 'overdue' ? 'text-debt-on-dark'
                      : dueInfo.status === 'due-soon' ? 'text-accent'
                      : 'text-white',
                    )}>
                      {dueText}
                    </span>
                    {dueInfo.daysPostponed > 0 && (
                      <span className="text-ink-300"> · បានពន្យា {dueInfo.daysPostponed} ថ្ងៃ</span>
                    )}
                  </p>
                )}
              </div>

              {/* Date picker + clear */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="customer-due"
                  type="date"
                  value={live.dueDate ?? ''}
                  onChange={(e) => handleSetDue(e.target.value || null)}
                  className="h-12 min-w-0 flex-1 rounded-sm bg-ink-700 px-3 text-body font-semibold text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-accent/60"
                />
                {live.dueDate && (
                  <button
                    type="button"
                    onClick={() => handleSetDue(null)}
                    aria-label="លុបថ្ងៃកំណត់"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-ink-700 text-ink-300 transition-colors active:bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              {!live.dueDate && (
                <p className="mt-2 text-caption text-ink-300">
                  មិនទាន់កំណត់ថ្ងៃសង — ជ្រើសថ្ងៃ ឬ ប្រើប៊ូតុងខាងក្រោម
                </p>
              )}

              {/* Quick postpone */}
              <div className="mt-3 flex items-center gap-2">
                <span className="shrink-0 text-meta font-semibold text-white">ពន្យារថ្ងៃសង</span>
                {[7, 15, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleSetDue(addDaysISODate(live.dueDate || todayISODate(), n))}
                    className="h-12 min-w-0 flex-1 rounded-sm bg-ink-700 text-body-sm font-bold tabular-nums text-white transition-colors active:bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    +{n} ថ្ងៃ
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 px-4 pt-4 md:px-6">

          {/* ─ Success banner ────────────────────────── */}
          {paySuccess && (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-success-bg px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
              onClick={dismissSuccess}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white" aria-hidden="true">
                <CheckCircle2 size={22} strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-bold text-success">
                  {paySuccess.after === 0 ? 'សំណូលអស់ហើយ!' : 'ទទួលប្រាក់ជោគជ័យ'}
                </span>
                <span className="mt-0.5 block text-meta tabular-nums text-success">
                  ទទួល {formatKHR(paySuccess.paid)}
                  {paySuccess.after > 0 && (
                    <> · នៅជំពាក់ <span className="font-bold">{formatKHR(paySuccess.after)}</span></>
                  )}
                </span>
              </span>
              <X size={18} className="shrink-0 text-success" aria-hidden="true" />
            </button>
          )}

          {/* ─ Paid-in-full state ────────────────────── */}
          {!hasDebt && txns.length > 0 && !paySuccess && (
            <div className="flex items-center gap-3 rounded-lg bg-success-bg px-4 py-3 text-success">
              <CheckCircle2 size={22} strokeWidth={2.25} aria-hidden="true" />
              <p className="text-body-sm font-bold">អតិថិជននេះបំណុលអស់ហើយ</p>
            </div>
          )}

          {/* ─ Debt summary ──────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="បំណុលដើម" value={formatKHR(totalCharged)} />
            <StatTile label="បានសង" dot="bg-success" value={formatKHR(totalPaid)} />
            <StatTile label="នៅសល់" dot={hasDebt ? 'bg-debt' : 'bg-success'} value={formatKHR(live.debtBalance)} />
          </div>

          <DetailTabs
            invoiceCount={debtItems.length}
            paymentCount={payments.length}
            invoices={
              /* ─ Debt items (invoices + opening balances) ── */
              debtItems.length === 0 ? (
                <p className="py-6 text-center text-meta text-text-muted">គ្មាន​បំណុល​ជំពាក់</p>
              ) : (
                <div className="space-y-2">
                  {debtItems.map((item) => {
                    const settledOff = item.currentRemaining === 0
                    const remainBadge = !settledOff && item.currentRemaining < item.orig ? (
                      <span className="mt-0.5 block text-caption font-semibold tabular-nums text-debt">
                        នៅខ្វះ {formatKHR(toKHR(item.currentRemaining))}
                      </span>
                    ) : null
                    const trailing = settledOff ? (
                      <span className="flex shrink-0 items-center gap-1 text-meta font-bold text-success">
                        <CheckCircle2 size={18} strokeWidth={2.25} aria-hidden="true" /> សងរួច
                      </span>
                    ) : (
                      <Button variant="primary" disabled={paying} onClick={() => setPendingPay(item)} className="shrink-0">
                        សង​ពេញ
                      </Button>
                    )

                    /* Manual debt row (not from a sale) */
                    if (item.kind === 'opening') {
                      const manualLabel = 'បំណុល'
                      const rowContent = (
                        <div className={cx('flex w-full items-center gap-3 rounded-lg py-3 pl-4 pr-3', settledOff ? 'bg-surface-2' : 'bg-surface')}>
                          <span
                            className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', settledOff ? 'bg-success-bg text-success' : 'bg-warn-bg text-warn')}
                            aria-hidden="true"
                          >
                            <Wallet size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cx('block text-body-sm font-bold tabular-nums', settledOff ? 'text-text-muted' : 'text-text')}>
                              {formatKHR(toKHR(item.orig))}
                            </span>
                            <span className="block truncate text-meta text-text-muted">
                              {manualLabel} · {formatDateKm(item.createdAt)}
                              {item.note && !['បំណុល', 'បំណុលថ្មី', 'បំណុលចាស់'].includes(item.note) ? <> · {item.note}</> : null}
                            </span>
                            {remainBadge}
                          </span>
                          {trailing}
                        </div>
                      )
                      /* Deletable only while untouched by payments (keeps the balance math clean) */
                      const deletable = item.currentRemaining === item.orig
                      if (!deletable) return <div key={item.id}>{rowContent}</div>
                      return (
                        <SwipeRow
                          key={item.id}
                          open={openVoidId === item.id}
                          onOpen={() => setOpenVoidId(item.id)}
                          onClose={() => setOpenVoidId((cur) => (cur === item.id ? null : cur))}
                          onVoid={() => setPendingVoid({ id: item.id, amount: toKHR(item.orig) as KHR, kind: 'opening' })}
                          voiding={false}
                        >
                          {rowContent}
                        </SwipeRow>
                      )
                    }

                    /* Sale invoice row */
                    const sale = item.sale as Sale
                    const isPartial = sale.paymentType === 'partial'
                    return (
                      <div key={item.id} className={cx('flex items-center gap-2 rounded-lg pr-3', settledOff ? 'bg-surface-2' : 'bg-surface')}>
                        <button
                          type="button"
                          onClick={() => setReprintSale(sale)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-3 pl-4 text-left transition-colors active:bg-bg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink-900"
                        >
                          <span
                            className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', settledOff ? 'bg-success-bg text-success' : 'bg-bg text-text-subtle')}
                            aria-hidden="true"
                          >
                            <Receipt size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cx('block text-body-sm font-bold tabular-nums', settledOff ? 'text-text-muted' : 'text-text')}>
                              {formatKHR(sale.totalAmount)}
                            </span>
                            <span className="block truncate text-meta tabular-nums text-text-muted">
                              #{sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase()} · {formatDateKm(sale.createdAt)} ·{' '}
                              <span className={settledOff ? 'font-semibold text-text-muted line-through' : isPartial ? 'font-semibold text-warn' : 'font-semibold text-debt'}>
                                {isPartial ? 'បង់ខ្លះ' : 'ជំពាក់'}
                              </span>
                            </span>
                            {!settledOff && item.currentRemaining < sale.totalAmount && (
                              <span className="mt-0.5 block text-caption font-semibold tabular-nums text-debt">
                                នៅខ្វះ {formatKHR(toKHR(item.currentRemaining))}
                              </span>
                            )}
                          </span>
                        </button>
                        {trailing}
                      </div>
                    )
                  })}
                </div>
              )
            }
            history={
              /* ─ Payment history ───────────────────────── */
              payments.length === 0 ? (
                <p className="py-6 text-center text-meta text-text-muted">មិន​ទាន់​មាន​ការ​ទទួល​ប្រាក់</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {payments.map((txn) => (
                      <SwipeRow
                        key={txn.id}
                        open={openVoidId === txn.id}
                        onOpen={() => setOpenVoidId(txn.id)}
                        onClose={() => setOpenVoidId((cur) => (cur === txn.id ? null : cur))}
                        onVoid={() => setPendingVoid({ id: txn.id, amount: txn.amount, kind: 'payment' })}
                        voiding={false}
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-bg text-success" aria-hidden="true">
                            <ArrowUpRight size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-body-sm font-semibold text-text">ទទួល​ប្រាក់ · {debtMethodLabel(txn.method)}</p>
                            <p className="truncate text-meta text-text-muted">
                              {formatDateTimeKm(txn.createdAt)}{txn.note && <> · {txn.note}</>}
                            </p>
                          </div>
                          <p className="shrink-0 text-body-sm font-bold tabular-nums text-success">−{formatKHR(txn.amount)}</p>
                        </div>
                      </SwipeRow>
                    ))}
                  </div>
                  {payments.length > 0 && (
                    <p className="pt-2 text-center text-caption text-text-muted">← អូស​ឆ្វេង​ដើម្បី​លុប​ការ​សង</p>
                  )}
                </>
              )
            }
          />
        </div>
      </Sheet>

      {/* ── Hidden statement card — captured by html2canvas ─── */}
      <div className="fixed left-0 top-0" aria-hidden="true">
        <div
          ref={statementRef}
          className="absolute -left-[9999px] top-0 w-[360px] bg-white leading-[1.5]"
        >
          {/* Header */}
          <div className="bg-ink-900 px-5 py-4 text-white">
            <p className="text-meta font-bold leading-[1.5] text-white">
              {storeName || 'ហាងលក់ទំនិញ'}
            </p>
            {receiptShowPhone && storePhone && (
              <p className="mt-0.5 text-caption leading-[1.5] text-ink-300">📞 {storePhone}</p>
            )}
            <p className="mt-1 text-caption leading-[1.5] text-ink-300">
              បង្កើតថ្ងៃ: {formatDateTimeKm(nowISO())}
            </p>
          </div>

          {/* Title */}
          <div className="border-b border-line bg-surface-2 px-5 py-3">
            <p className="text-caption font-bold uppercase leading-[1.5] tracking-widest text-text-subtle">
              សេចក្ដីសង្ខេបបំណុល
            </p>
          </div>

          {/* Customer info */}
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-title-sm font-bold leading-[1.5]',
              live.debtBalance > 0 ? 'bg-debt-bg text-debt' : 'bg-success-bg text-success',
            ].join(' ')}>
              {live.nameKm.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-body font-bold leading-[1.5] text-text">{live.nameKm}</p>
              {live.phone && <p className="mt-0.5 text-meta leading-[1.5] text-text-muted">📞 {live.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-caption leading-[1.5] text-text-muted">ជំពាក់សរុប</p>
              <p className={[
                'text-title font-bold tabular-nums leading-[1.5]',
                live.debtBalance > 0 ? 'text-debt' : 'text-success',
              ].join(' ')}>
                {formatKHR(live.debtBalance)}
              </p>
              <p className="text-meta font-bold tabular-nums leading-[1.5] text-text-subtle">
                {formatUSD(live.debtBalance)}
              </p>
            </div>
          </div>

          {/* Transactions */}
          <div className="px-5 pb-1 pt-3">
            <p className="mb-2 text-caption font-bold uppercase leading-[1.5] tracking-widest text-text-subtle">
              ប្រវត្តិប្រតិបត្តិការ
            </p>
          </div>
          <div className="divide-y divide-line">
            {txnsWithBalance.slice(0, 10).map((txn) => {
              const isPay = txn.type === 'payment'
              return (
                <div key={txn.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-meta leading-[1.5]',
                    isPay ? 'bg-success-bg text-success' : 'bg-debt-bg text-debt',
                  ].join(' ')}>
                    {isPay ? '↑' : '↓'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-meta font-semibold leading-[1.5] text-text">
                      {isPay ? 'ទទួលប្រាក់' : 'ជំពាក់ (ការលក់)'}
                    </p>
                    <p className="text-caption leading-[1.5] text-text-muted">{formatDateTimeKm(txn.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={[
                      'text-meta font-bold tabular-nums leading-[1.5]',
                      isPay ? 'text-success' : 'text-debt',
                    ].join(' ')}>
                      {isPay ? '−' : '+'}{formatKHR(txn.amount)}
                    </p>
                    <p className="text-caption tabular-nums leading-[1.5] text-text-muted">
                      នៅ {formatKHR(txn.runningBalance)}
                    </p>
                  </div>
                </div>
              )
            })}
            {txnsWithBalance.length > 10 && (
              <p className="px-5 py-2 text-center text-caption leading-[1.5] text-text-muted">
                + {txnsWithBalance.length - 10} ប្រតិបត្តិការ​ទៀត
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-2 border-t-2 border-ink-900 px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-meta font-bold leading-[1.5] text-text-subtle">នៅជំពាក់ (ចុងក្រោយ)</p>
              <p className={[
                'text-right text-title-sm font-bold tabular-nums leading-[1.5]',
                live.debtBalance > 0 ? 'text-debt' : 'text-success',
              ].join(' ')}>
                {live.debtBalance > 0
                  ? <>{formatKHR(live.debtBalance)}<span className="block text-meta leading-[1.5] text-text-subtle">{formatUSD(live.debtBalance)}</span></>
                  : '✅ អស់ហើយ'}
              </p>
            </div>
            <p className="mt-2 text-center text-caption leading-[1.5] text-text-muted">
              {storeName || 'POS ហាង'} · បង្កើតដោយ Rural POS
            </p>
          </div>
        </div>
      </div>

      {/* ─ Manual debt form (new debt now, or old/opening balance) ─ */}
      <Sheet
        open={showOb}
        onClose={closeObForm}
        layer="top"
        title="បន្ថែម​បំណុល"
        subtitle="មិន​មែន​ពី​ការ​លក់"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={closeObForm}>
              បោះបង់
            </Button>
            <Button variant="primary" size="lg" fullWidth className="flex-1" disabled={!canAddOb} onClick={handleAddDebt}>
              {savingOb ? '…' : 'បញ្ជាក់'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-1">
          <SegmentedControl
            ariaLabel="រូបិយប័ណ្ណបំណុល"
            items={[
              { value: 'KHR', label: '៛ រៀល' },
              { value: 'USD', label: '$ ដុល្លារ' },
            ]}
            value={obCurrency}
            onChange={(cur) => { setObCurrency(cur); setObAmount('') }}
          />

          <div>
            <div className="flex items-center gap-2 rounded-[18px] bg-bg px-4 focus-within:ring-2 focus-within:ring-ink-900/20">
              <span className="shrink-0 text-title-sm font-bold text-text-subtle">{obCurrency === 'USD' ? '$' : '៛'}</span>
              <input
                type="number"
                inputMode="decimal"
                value={obAmount}
                onChange={(e) => setObAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDebt()}
                placeholder="0"
                aria-label="ចំនួនបំណុល"
                autoFocus
                className="h-16 min-w-0 flex-1 bg-transparent text-right text-amount font-bold tabular-nums text-text outline-none placeholder:text-text-muted"
              />
            </div>
            {obKhr > 0 && (
              <p className="mt-1.5 px-1 text-right text-meta font-semibold tabular-nums text-text-subtle">
                {obCurrency === 'USD' ? `= ${formatKHR(toKHR(obKhr))}` : `≈ ${formatUSD(toKHR(obKhr))}`}
              </p>
            )}
          </div>

          {/* Date the debt was incurred (default today; pick a past date for old debt) */}
          <div className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-bg px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
            <label htmlFor="ob-date" className="flex items-center gap-1.5 text-caption font-semibold text-text-subtle">
              <CalendarClock size={14} strokeWidth={2.25} aria-hidden="true" /> ថ្ងៃ​ជំពាក់
            </label>
            <input
              id="ob-date"
              type="date"
              value={obDate}
              max={todayISODate()}
              onChange={(e) => setObDate(e.target.value)}
              className="w-full bg-transparent text-body font-semibold text-text outline-none"
            />
          </div>

          <Input
            label="កំណត់​ចំណាំ"
            type="text"
            value={obNote}
            onChange={(e) => setObNote(e.target.value)}
            placeholder="ឧ. ឲ្យ​ខ្ចី​សាច់ប្រាក់ / បំណុលចាស់ (ស្រេចចិត្ត)"
          />
        </div>
      </Sheet>

      {/* Edit sheet on top */}
      {editing && (
        <CustomerEditSheet
          customer={live}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onClose() }}
        />
      )}

      {/* Reprint receipt from an invoice */}
      {reprintSale && (
        <ReprintReceipt sale={reprintSale} onClose={() => setReprintSale(null)} />
      )}

      {/* Payment confirmation — guard against an accidental "សង​ពេញ" tap */}
      <ConfirmDialog
        open={!!pendingPay}
        tone="success"
        icon={<Banknote size={26} strokeWidth={2.25} />}
        title="បញ្ជាក់​ការ​សង​ពេញ?"
        message={pendingPay && (
          <>
            <p>
              វិក្កយបត្រ{' '}
              <span className="font-bold text-text">
                {pendingPay.kind === 'sale' ? `#${pendingPay.sale?.receiptNumber || pendingPay.id.slice(0, 8).toUpperCase()}` : 'បំណុល'}
              </span>{' '}
              នឹង​ត្រូវ​សង​ពេញ{' '}
              <span className="font-bold tabular-nums text-success">{formatKHR(toKHR(pendingPay.currentRemaining))}</span>{' '}
              ({debtMethodLabel(payMethod)})។
            </p>

            {/* Payment method */}
            <div className="mt-4 text-left">
              <p className="mb-1.5 text-meta font-semibold text-text-subtle">វិធីសាស្ត្រ​ទទួល</p>
              <div className="grid grid-cols-3 gap-2">
                {DEBT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id)}
                    aria-pressed={payMethod === m.id}
                    className={cx(
                      'flex h-12 items-center justify-center gap-1 rounded-sm text-meta font-bold transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                      payMethod === m.id ? 'bg-ink-900 text-white' : 'bg-bg text-text active:bg-line',
                    )}
                  >
                    <span aria-hidden="true">{m.emoji}</span> {m.label}
                  </button>
                ))}
              </div>

              {/* Note */}
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="កំណត់​ចំណាំ (ស្រេចចិត្ត)"
                aria-label="កំណត់​ចំណាំ"
                className="mt-2 h-12 w-full rounded-sm bg-bg px-3 text-body text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-ink-900/20"
              />
            </div>
          </>
        )}
        confirmLabel="បាទ/ចាស សង"
        busyLabel="កំពុង​សង…"
        busy={paying}
        onConfirm={() => { if (pendingPay) handlePayInvoice(pendingPay) }}
        onCancel={() => setPendingPay(null)}
      />

      {/* Void confirmation — payment or opening balance */}
      <ConfirmDialog
        open={!!pendingVoid}
        tone="danger"
        icon={<Trash2 size={26} strokeWidth={2.25} />}
        title={pendingVoid?.kind === 'payment' ? 'លុប​ការ​ទទួល​ប្រាក់​នេះ?' : 'លុប​បំណុលចាស់​នេះ?'}
        message={pendingVoid && (
          pendingVoid.kind === 'payment' ? (
            <>លុយ <span className="font-bold tabular-nums text-danger">{formatKHR(pendingVoid.amount)}</span> នឹង​ត្រឡប់​ចូល​បំណុល​អតិថិជន​វិញ ហើយ​កំណត់ត្រា​ការ​សង​នេះ​នឹង​ត្រូវ​លុប។</>
          ) : (
            <>បំណុល <span className="font-bold tabular-nums text-danger">{formatKHR(pendingVoid.amount)}</span> នឹង​ត្រូវ​ដក​ចេញ​ពី​សមតុល្យ​អតិថិជន។ កំណត់ត្រា​បំណុលចាស់​នេះ​នឹង​ត្រូវ​លុប។</>
          )
        )}
        confirmLabel="បាទ/ចាស លុប"
        busyLabel="កំពុង​លុប…"
        busy={voiding}
        onConfirm={handleConfirmVoid}
        onCancel={() => { setPendingVoid(null); setOpenVoidId(null) }}
      />
    </>
  )
}

/* ── Invoices / payment-history switch (UI state only) ───── */
function DetailTabs({
  invoiceCount, paymentCount, invoices, history,
}: {
  invoiceCount: number
  paymentCount: number
  invoices: ReactNode
  history: ReactNode
}) {
  const [tab, setTab] = useState<'invoices' | 'history'>('invoices')
  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="វិក្កយបត្រ ឬ ប្រវត្តិបង់ប្រាក់"
        items={[
          { value: 'invoices', label: `វិក្កយបត្រ${invoiceCount > 0 ? ` (${invoiceCount})` : ''}` },
          { value: 'history',  label: `ប្រវត្តិបង់ប្រាក់${paymentCount > 0 ? ` (${paymentCount})` : ''}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'invoices' ? invoices : history}
    </div>
  )
}
