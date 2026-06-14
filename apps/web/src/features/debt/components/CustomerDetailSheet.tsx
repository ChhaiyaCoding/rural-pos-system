'use client'

import { useState, useMemo, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { X, Phone, MapPin, ArrowUpRight, Banknote, Pencil, CheckCircle2, ChevronRight, ImageDown, Check, CalendarClock, Receipt, Trash2, Wallet, Plus } from 'lucide-react'
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
import type { Customer, Sale, DebtPaymentMethod } from '@/types'
import type { TenantId, CustomerId, KHR, UUID } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  customer: Customer
  onClose: () => void
}

/* ── Quick-amount presets ────────────────────────────────── */
const QUICK_AMTS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000]
const USD_AMTS   = [1, 2, 5, 10, 20, 50, 100]

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
    <div className="relative overflow-hidden bg-slate-50">
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
          className="w-full h-full rounded-xl bg-danger-600 text-white shadow-sm flex flex-col items-center justify-center gap-1 active:bg-danger-700 disabled:opacity-60 transition-colors"
        >
          <Trash2 size={17} strokeWidth={2.25} />
          <span className="text-[11px] font-bold leading-none">លុប</span>
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
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  )
}

export function CustomerDetailSheet({ customer, onClose }: Props) {
  const [payAmount,   setPayAmount]   = useState('')
  const [payCurrency, setPayCurrency] = useState<'KHR' | 'USD'>('KHR')
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

  /* Debt items with FIFO-reconciled outstanding — unifies sale invoices AND
     opening-balance charges (saleId=null). Payments are customer-level, so we
     allocate the total paid oldest-first across every debt item to derive each
     item's *current* remaining. Sum of currentRemaining === debtBalance. */
  const debtItems = useMemo(() => {
    const openings = txns
      .filter((t) => t.type === 'charge' && t.saleId == null)
      .map((t) => ({ kind: 'opening' as const, id: String(t.id), createdAt: t.createdAt, orig: t.amount as number, note: t.note, chargeKind: t.chargeKind ?? 'opening', sale: null as Sale | null }))
    const saleItems = sales
      .map((s) => ({ kind: 'sale' as const, id: String(s.id), createdAt: s.createdAt, orig: (s.totalAmount - s.paidAmount) as number, note: null as string | null, sale: s as Sale | null }))
    const all = [...openings, ...saleItems].sort((a, b) => a.createdAt.localeCompare(b.createdAt))  // oldest first
    let pool = totalPaid as number
    const reconciled = all.map((it) => {
      const settled = Math.min(pool, it.orig)
      pool -= settled
      return { ...it, currentRemaining: it.orig - settled }
    })
    return reconciled.reverse()  // newest first for display
  }, [sales, txns, totalPaid])

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
  const initial = live.nameKm.charAt(0) || '?'

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

  /* Parsed input → normalized to ៛ (the debt is always stored in ៛).
     When paying in $, convert at the configured exchange rate. */
  const rate       = getExchangeRate()
  const parsedAmt  = Number(payAmount) || 0
  const khrInput   = payCurrency === 'USD' ? Math.round(parsedAmt * rate) : Math.round(parsedAmt)
  const clampedAmt = Math.min(khrInput, live.debtBalance)
  const isOverpay  = khrInput > live.debtBalance && khrInput > 0
  const canPay     = clampedAmt > 0 && !paying

  /* ── Handle payment ──────────────────────────────────── */
  const handlePay = async () => {
    if (!canPay) return
    setPaying(true)
    try {
      const result = await debtService.recordPayment({
        tenantId:   DEMO_TENANT,
        customerId: customer.id as CustomerId,
        amount:     toKHR(clampedAmt) as KHR,
        method:     payMethod,
        ...(payNote.trim() ? { note: payNote.trim() } : {}),
      })
      if (result.ok) {
        const after = Math.max(0, live.debtBalance - clampedAmt) as KHR
        setPaySuccess({ paid: toKHR(clampedAmt) as KHR, after })
        setPayAmount('')
        setPayNote('')
        setShowPay(false)
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
        {/* ── Header ─────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <span className="text-[16px] font-bold text-slate-900">ព័ត៌មានអតិថិជន</span>
          <div className="flex items-center gap-2">
            {/* Share statement as image */}
            <button
              type="button"
              onClick={handleShareStatement}
              disabled={capturing}
              className={[
                'h-9 px-3 flex items-center gap-1.5 rounded-full text-[12px] font-bold transition-colors',
                shareOk
                  ? 'bg-success-50 text-success-600'
                  : 'bg-slate-100 text-slate-600 active:bg-slate-200',
              ].join(' ')}
              aria-label="ចែករំលែកបំណុល"
            >
              {capturing ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
              ) : shareOk ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <ImageDown size={14} strokeWidth={2.25} />
              )}
              {capturing ? '…' : shareOk ? 'រួចរាល់' : 'ចែករំលែក'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-50 text-primary-600 active:bg-primary-100"
              aria-label="កែប្រែ"
            >
              <Pencil size={15} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ─ Profile card ──────────────────────────── */}
          <div className="px-4 py-5 flex items-center gap-4 border-b border-slate-100">
            <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
              {live.imageUri ? (
                <img src={live.imageUri} alt={live.nameKm} className="w-full h-full object-cover" />
              ) : (
                <div className={[
                  'w-full h-full flex items-center justify-center text-[26px] font-bold',
                  hasDebt ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700',
                ].join(' ')}>
                  {initial}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold text-slate-900">{live.nameKm}</p>
              {live.phone && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone size={11} className="text-slate-400 shrink-0" />
                  <span className="text-[12px] text-slate-400">{live.phone}</span>
                </div>
              )}
              {live.address && (
                <div className="flex items-start gap-1 mt-0.5">
                  <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[12px] text-slate-400 leading-snug">{live.address}</span>
                </div>
              )}
            </div>

            {/* Balance */}
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-slate-400 mb-0.5">ជំពាក់សរុប</p>
              <p className={[
                'text-[20px] font-extrabold tabular-nums transition-all duration-500 leading-tight',
                hasDebt ? 'text-danger-600' : 'text-success-600',
              ].join(' ')}>
                {formatKHR(live.debtBalance)}
              </p>
              <p className="text-[12px] font-bold text-primary-600 tabular-nums">
                {formatUSD(live.debtBalance)}
              </p>
            </div>
          </div>

          {/* ─ Due date (repayment deadline) ─────────── */}
          {hasDebt && (
            <div className="px-4 pt-4">
              <div className={[
                'rounded-2xl border p-4',
                dueInfo.status === 'overdue'  ? 'border-danger-200 bg-danger-50'
                : dueInfo.status === 'due-soon' ? 'border-warning-200 bg-warning-50'
                : 'border-slate-200 bg-white',
              ].join(' ')}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                    <CalendarClock size={14} strokeWidth={2.25} /> ថ្ងៃកំណត់សង
                  </p>
                  {dueBadge && (
                    <span className={['text-[11px] font-bold px-2 py-0.5 rounded-full', dueBadge.cls].join(' ')}>
                      {dueBadge.text}
                    </span>
                  )}
                </div>

                {/* Date picker + clear */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={live.dueDate ?? ''}
                    onChange={(e) => handleSetDue(e.target.value || null)}
                    className="flex-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-primary-500"
                  />
                  {live.dueDate && (
                    <button
                      type="button"
                      onClick={() => handleSetDue(null)}
                      aria-label="លុបថ្ងៃកំណត់"
                      className="shrink-0 w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-400 flex items-center justify-center active:bg-slate-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Status detail */}
                {live.dueDate ? (
                  <p className="mt-2 text-[12px] tabular-nums">
                    <span className={[
                      'font-bold',
                      dueInfo.status === 'overdue' ? 'text-danger-700'
                      : dueInfo.status === 'due-soon' ? 'text-warning-700'
                      : 'text-slate-600',
                    ].join(' ')}>
                      {dueText}
                    </span>
                    {dueInfo.daysPostponed > 0 && (
                      <span className="text-slate-500"> · បានពន្យា {dueInfo.daysPostponed} ថ្ងៃ</span>
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">
                    មិនទាន់កំណត់ថ្ងៃសង — ជ្រើសថ្ងៃ ឬ ប្រើប៊ូតុងខាងក្រោម
                  </p>
                )}

                {/* Quick postpone */}
                <div className="flex gap-2 mt-2.5">
                  {[7, 15, 30].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSetDue(addDaysISODate(live.dueDate || todayISODate(), n))}
                      className="flex-1 h-9 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 active:bg-slate-50"
                    >
                      +{n} ថ្ងៃ
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─ Success banner ────────────────────────── */}
          {paySuccess && (
            <div
              className="mx-4 mt-4 rounded-2xl border border-success-200 bg-success-50 px-4 py-3.5 flex items-center gap-3"
              onClick={dismissSuccess}
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-success-500 text-white flex items-center justify-center">
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-success-800">
                  {paySuccess.after === 0 ? '🎉 សំណូលអស់ហើយ!' : 'ទទួលប្រាក់ជោគជ័យ'}
                </p>
                <p className="text-[12px] text-success-600 mt-0.5 tabular-nums">
                  ទទួល {formatKHR(paySuccess.paid)}
                  {paySuccess.after > 0 && (
                    <> · នៅជំពាក់ <span className="font-bold">{formatKHR(paySuccess.after)}</span></>
                  )}
                </p>
              </div>
              <X size={14} className="shrink-0 text-success-400" />
            </div>
          )}

          {/* ─ Paid-in-full state ────────────────────── */}
          {!hasDebt && txns.length > 0 && !paySuccess && (
            <div className="mx-4 mt-4 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 flex items-center gap-3">
              <span className="text-[24px]">✅</span>
              <p className="text-[13px] font-bold text-success-700">អតិថិជននេះបំណុលអស់ហើយ</p>
            </div>
          )}

          {/* ─ Receive payment button ────────────────── */}
          {hasDebt && !showPay && (
            <div className="px-4 mt-4">
              <button
                type="button"
                onClick={() => { setShowPay(true); setShowOb(false) }}
                className="w-full h-13 rounded-2xl bg-success-600 text-white font-bold text-[15px] flex items-center justify-center gap-2.5 active:bg-success-700 transition-colors py-3.5"
              >
                <Banknote size={20} strokeWidth={2} />
                ទទួលប្រាក់បំណុល
                <ChevronRight size={16} className="opacity-70" />
              </button>
            </div>
          )}

          {/* ─ Add manual debt (one entry) ───────────── */}
          {!showOb && !showPay && (
            <div className="px-4 mt-3">
              <button
                type="button"
                onClick={openObForm}
                className="w-full h-12 rounded-2xl border border-warning-100 bg-warning-50 text-warning-700 font-bold text-[14px] flex items-center justify-center gap-2 active:bg-warning-100 transition-colors"
              >
                <Plus size={18} strokeWidth={2.5} />
                បន្ថែម​បំណុល
              </button>
            </div>
          )}

          {/* ─ Manual debt form ──────────────────────── */}
          {showOb && (
            <div className="mx-4 mt-4 rounded-2xl border border-warning-100 bg-warning-50 px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-warning-700 flex items-center gap-1.5">
                  <Plus size={14} strokeWidth={2.5} /> បន្ថែម​បំណុល (មិន​មែន​ពី​ការ​លក់)
                </p>
                <div className="flex items-center rounded-lg border border-warning-100 bg-white overflow-hidden">
                  {(['KHR', 'USD'] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => { setObCurrency(cur); setObAmount('') }}
                      className={[
                        'min-h-0 min-w-0 h-7 px-3.5 text-[13px] font-bold tabular-nums transition-colors',
                        obCurrency === cur ? 'bg-warning-600 text-white' : 'text-warning-700 active:bg-warning-50',
                      ].join(' ')}
                    >
                      {cur === 'KHR' ? '៛' : '$'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex items-center border border-warning-100 rounded-xl bg-white overflow-hidden">
                  <span className="pl-4 text-[15px] font-bold text-slate-400 shrink-0">{obCurrency === 'USD' ? '$' : '៛'}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={obAmount}
                    onChange={(e) => setObAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDebt()}
                    placeholder="0"
                    autoFocus
                    className="flex-1 h-12 px-3 text-[18px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none min-w-0"
                  />
                </div>
                <button
                  type="button"
                  disabled={!canAddOb}
                  onClick={handleAddDebt}
                  className="h-12 px-4 rounded-xl bg-warning-600 text-white font-bold text-[14px] disabled:opacity-40 active:bg-warning-700 transition-colors whitespace-nowrap"
                >
                  {savingOb ? '…' : 'បញ្ជាក់'}
                </button>
                <button
                  type="button"
                  onClick={closeObForm}
                  className="h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center active:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              {obKhr > 0 && (
                <p className="mt-1.5 text-right text-[12px] font-bold text-primary-600 tabular-nums">
                  {obCurrency === 'USD' ? `= ${formatKHR(toKHR(obKhr))}` : `≈ ${formatUSD(toKHR(obKhr))}`}
                </p>
              )}

              {/* Date the debt was incurred (default today; pick a past date for old debt) */}
              <div className="mt-3">
                <p className="text-[11px] font-bold text-warning-700 mb-1.5 flex items-center gap-1.5">
                  <CalendarClock size={13} strokeWidth={2.25} /> ថ្ងៃ​ជំពាក់
                </p>
                <input
                  type="date"
                  value={obDate}
                  max={todayISODate()}
                  onChange={(e) => setObDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-warning-100 bg-white text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-warning-500"
                />
              </div>

              <input
                type="text"
                value={obNote}
                onChange={(e) => setObNote(e.target.value)}
                placeholder="ឧ. ឲ្យ​ខ្ចី​សាច់ប្រាក់ / បំណុលចាស់ (ស្រេចចិត្ត)"
                className="w-full h-10 mt-3 rounded-lg border border-warning-100 bg-white px-3 text-[13px] placeholder:text-slate-300 focus:outline-none focus:border-warning-500"
              />
            </div>
          )}

          {/* ─ Payment form ─────────────────────────── */}
          {showPay && (
            <div className="mx-4 mt-4 rounded-2xl border border-success-200 bg-success-50 px-4 py-4">

              {/* Label + currency toggle */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-success-700">ចំនួនប្រាក់ទទួល</p>
                <div className="flex items-center rounded-lg border border-success-300 bg-white overflow-hidden">
                  {(['KHR', 'USD'] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => { setPayCurrency(cur); setPayAmount('') }}
                      className={[
                        'min-h-0 min-w-0 h-7 px-3.5 text-[13px] font-bold tabular-nums transition-colors',
                        payCurrency === cur ? 'bg-success-600 text-white' : 'text-success-700 active:bg-success-50',
                      ].join(' ')}
                    >
                      {cur === 'KHR' ? '៛' : '$'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owed (both currencies) */}
              <p className="text-[11px] text-slate-500 tabular-nums mb-2">
                ជំពាក់ {formatKHR(live.debtBalance)} · {formatUSD(live.debtBalance)}
              </p>

              {/* Amount input */}
              <div className="flex gap-2">
                <div className={[
                  'flex-1 flex items-center border rounded-xl bg-white overflow-hidden transition-colors',
                  isOverpay ? 'border-warning-400' : 'border-success-300',
                ].join(' ')}>
                  <span className="pl-4 text-[15px] font-bold text-slate-400 shrink-0">
                    {payCurrency === 'USD' ? '$' : '៛'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                    placeholder="0"
                    autoFocus
                    className="flex-1 h-12 px-3 text-[18px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none min-w-0"
                  />
                </div>
                <button
                  type="button"
                  disabled={!canPay}
                  onClick={() => handlePay()}
                  className="h-12 px-4 rounded-xl bg-success-600 text-white font-bold text-[14px] disabled:opacity-40 active:bg-success-700 transition-colors whitespace-nowrap"
                >
                  {paying ? '…' : 'បញ្ជាក់'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPay(false); setPayAmount('') }}
                  className="h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center active:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Equivalent in the other currency */}
              {clampedAmt > 0 && (
                <p className="mt-1.5 text-right text-[12px] font-bold text-primary-600 tabular-nums">
                  {payCurrency === 'USD'
                    ? `= ${formatKHR(toKHR(clampedAmt))}`
                    : `≈ ${formatUSD(toKHR(clampedAmt))}`}
                </p>
              )}

              {/* Overpay warning */}
              {isOverpay && (
                <p className="mt-1 text-[11px] text-warning-700 font-semibold">
                  ⚠ ចំនួនលើសបំណុល — នឹងទទួល {formatKHR(toKHR(clampedAmt))} ជំនួស
                </p>
              )}

              {/* Quick amount chips — currency-aware */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {payCurrency === 'KHR'
                  ? QUICK_AMTS.filter((a) => a <= live.debtBalance).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPayAmount(String(amt))}
                        className={[
                          'h-8 px-3 rounded-lg border text-[12px] font-semibold tabular-nums transition-colors',
                          payAmount === String(amt)
                            ? 'bg-success-600 border-success-600 text-white'
                            : 'bg-white border-success-200 text-success-700 active:bg-success-100',
                        ].join(' ')}
                      >
                        {formatKHR(toKHR(amt))}
                      </button>
                    ))
                  : USD_AMTS.filter((u) => u * rate <= live.debtBalance).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setPayAmount(String(u))}
                        className={[
                          'h-8 px-3 rounded-lg border text-[12px] font-semibold tabular-nums transition-colors',
                          payAmount === String(u)
                            ? 'bg-success-600 border-success-600 text-white'
                            : 'bg-white border-success-200 text-success-700 active:bg-success-100',
                        ].join(' ')}
                      >
                        ${u}
                      </button>
                    ))
                }
                {/* Full payment — settles the exact ៛ balance */}
                <button
                  type="button"
                  onClick={() => { setPayCurrency('KHR'); setPayAmount(String(live.debtBalance)) }}
                  className={[
                    'h-8 px-3 rounded-lg border text-[12px] font-bold tabular-nums transition-colors',
                    payCurrency === 'KHR' && payAmount === String(live.debtBalance)
                      ? 'bg-success-600 border-success-600 text-white'
                      : 'bg-success-100 border-success-300 text-success-800 active:bg-success-200',
                  ].join(' ')}
                >
                  ✓ សងទាំងអស់ {formatKHR(live.debtBalance)}
                </button>
              </div>

              {/* Payment method */}
              <div className="mt-3">
                <p className="text-[11px] font-bold text-success-700 mb-1.5">វិធីសាស្ត្រ​ទទួល</p>
                <div className="grid grid-cols-3 gap-2">
                  {DEBT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={[
                        'h-10 rounded-lg border text-[12px] font-bold flex items-center justify-center gap-1 transition-colors',
                        payMethod === m.id ? 'border-success-600 bg-success-600 text-white' : 'bg-white border-success-200 text-success-700 active:bg-success-100',
                      ].join(' ')}
                    >
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="កំណត់​ចំណាំ (ស្រេចចិត្ត)"
                className="w-full h-10 mt-3 rounded-lg border border-success-200 bg-white px-3 text-[13px] placeholder:text-slate-300 focus:outline-none focus:border-success-500"
              />
            </div>
          )}

          {/* ─ Debt summary ──────────────────────────── */}
          <div className="px-4 mt-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">សង្ខេបបំណុល</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">បំណុលដើម</p>
                  <p className="text-[14px] font-extrabold text-slate-900 tabular-nums">{formatKHR(totalCharged)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">បានសង</p>
                  <p className="text-[14px] font-extrabold text-success-700 tabular-nums">{formatKHR(totalPaid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">នៅសល់</p>
                  <p className={['text-[14px] font-extrabold tabular-nums', hasDebt ? 'text-danger-600' : 'text-success-600'].join(' ')}>{formatKHR(live.debtBalance)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─ Debt items (invoices + opening balances) ── */}
          <div className="mt-4">
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">វិក្កយបត្រ & បំណុលចាស់</p>
              {debtItems.length > 0 && <p className="text-[11px] text-slate-400">{debtItems.length}</p>}
            </div>
            {debtItems.length === 0 ? (
              <p className="px-4 py-4 text-center text-[12px] text-slate-400">គ្មាន​បំណុល​ជំពាក់</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {debtItems.map((item) => {
                  const settledOff = item.currentRemaining === 0
                  const remainBadge = settledOff ? (
                    <p className="text-[10px] font-semibold text-success-600 tabular-nums">✓ សងរួច</p>
                  ) : item.currentRemaining < item.orig ? (
                    <p className="text-[10px] text-danger-500 tabular-nums">នៅខ្វះ {formatKHR(toKHR(item.currentRemaining))}</p>
                  ) : null

                  /* Manual debt row (not from a sale) */
                  if (item.kind === 'opening') {
                    const manualLabel = 'បំណុល'
                    const rowContent = (
                      <div className="w-full flex items-center gap-3 px-4 py-3">
                        <div className={[
                          'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                          settledOff ? 'bg-success-100' : 'bg-warning-100',
                        ].join(' ')}>
                          <Wallet size={16} className={settledOff ? 'text-success-600' : 'text-warning-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate">{manualLabel}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {formatDateKm(item.createdAt)}
                            {item.note && !['បំណុល', 'បំណុលថ្មី', 'បំណុលចាស់'].includes(item.note) ? <> · {item.note}</> : null}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-bold text-slate-900 tabular-nums">{formatKHR(toKHR(item.orig))}</p>
                          {remainBadge}
                        </div>
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
                    <button key={item.id} type="button" onClick={() => setReprintSale(sale)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors">
                      <div className={[
                        'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                        settledOff ? 'bg-success-100' : 'bg-slate-100',
                      ].join(' ')}>
                        <Receipt size={16} className={settledOff ? 'text-success-600' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 tabular-nums truncate">#{sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase()}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateKm(sale.createdAt)} · <span className={isPartial ? 'text-warning-600 font-semibold' : 'text-danger-600 font-semibold'}>{isPartial ? 'ផ្នែក' : 'ជំពាក់'}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-slate-900 tabular-nums">{formatKHR(sale.totalAmount)}</p>
                        {remainBadge}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ─ Payment history ───────────────────────── */}
          <div className="mt-4 pb-6">
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">ប្រវត្តិ​ទទួល​ប្រាក់</p>
              {payments.length > 0 && <p className="text-[11px] text-slate-400">{payments.length} ដង</p>}
            </div>
            {payments.length === 0 ? (
              <p className="px-4 py-4 text-center text-[12px] text-slate-400">មិន​ទាន់​មាន​ការ​ទទួល​ប្រាក់</p>
            ) : (
              <>
              <div className="divide-y divide-slate-100">
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
                      <div className="shrink-0 w-9 h-9 rounded-full bg-success-100 flex items-center justify-center">
                        <ArrowUpRight size={16} className="text-success-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800">ទទួល​ប្រាក់ · {debtMethodLabel(txn.method)}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateTimeKm(txn.createdAt)}{txn.note && <> · {txn.note}</>}
                        </p>
                      </div>
                      <p className="text-[14px] font-bold text-success-600 tabular-nums shrink-0">−{formatKHR(txn.amount)}</p>
                    </div>
                  </SwipeRow>
                ))}
              </div>
              {payments.length > 0 && (
                <p className="px-4 pt-2 text-[10px] text-slate-300 text-center">← អូស​ឆ្វេង​ដើម្បី​លុប​ការ​សង</p>
              )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* ── Hidden statement card — captured by html2canvas ─── */}
      <div
        ref={statementRef}
        className="absolute -left-[9999px] top-0 w-[360px] bg-white"
        aria-hidden="true"
      >
        {/* Header */}
        <div className="bg-primary-600 px-5 py-4 text-white">
          <p className="text-[13px] font-bold opacity-80">
            {storeName || 'ហាងលក់ទំនិញ'}
          </p>
          {receiptShowPhone && storePhone && (
            <p className="text-[11px] opacity-60 mt-0.5">📞 {storePhone}</p>
          )}
          <p className="text-[10px] opacity-50 mt-1">
            បង្កើតថ្ងៃ: {formatDateTimeKm(nowISO())}
          </p>
        </div>

        {/* Title */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            សេចក្ដីសង្ខេបបំណុល
          </p>
        </div>

        {/* Customer info */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className={[
            'w-12 h-12 rounded-full flex items-center justify-center text-[20px] font-bold shrink-0',
            live.debtBalance > 0 ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700',
          ].join(' ')}>
            {live.nameKm.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-extrabold text-slate-900">{live.nameKm}</p>
            {live.phone && <p className="text-[12px] text-slate-400 mt-0.5">📞 {live.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">ជំពាក់សរុប</p>
            <p className={[
              'text-[22px] font-extrabold tabular-nums leading-tight',
              live.debtBalance > 0 ? 'text-danger-600' : 'text-success-600',
            ].join(' ')}>
              {formatKHR(live.debtBalance)}
            </p>
            <p className="text-[12px] font-bold text-primary-600 tabular-nums">
              {formatUSD(live.debtBalance)}
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            ប្រវត្តិប្រតិបត្តិការ
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {txnsWithBalance.slice(0, 10).map((txn) => {
            const isPay = txn.type === 'payment'
            return (
              <div key={txn.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[12px] shrink-0',
                  isPay ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600',
                ].join(' ')}>
                  {isPay ? '↑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800">
                    {isPay ? 'ទទួលប្រាក់' : 'ជំពាក់ (ការលក់)'}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDateTimeKm(txn.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={[
                    'text-[13px] font-bold tabular-nums',
                    isPay ? 'text-success-600' : 'text-danger-600',
                  ].join(' ')}>
                    {isPay ? '−' : '+'}{formatKHR(txn.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400 tabular-nums">
                    នៅ {formatKHR(txn.runningBalance)}
                  </p>
                </div>
              </div>
            )
          })}
          {txnsWithBalance.length > 10 && (
            <p className="px-5 py-2 text-[11px] text-slate-400 text-center">
              + {txnsWithBalance.length - 10} ប្រតិបត្តិការ​ទៀត
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t-2 border-slate-800 mt-2">
          <div className="flex justify-between items-center">
            <p className="text-[12px] font-bold text-slate-600">នៅជំពាក់ (ចុងក្រោយ)</p>
            <p className={[
              'text-[18px] font-extrabold tabular-nums text-right leading-tight',
              live.debtBalance > 0 ? 'text-danger-600' : 'text-success-600',
            ].join(' ')}>
              {live.debtBalance > 0
                ? <>{formatKHR(live.debtBalance)}<span className="block text-[12px] text-primary-600">{formatUSD(live.debtBalance)}</span></>
                : '✅ អស់ហើយ'}
            </p>
          </div>
          <p className="text-[10px] text-slate-300 mt-2 text-center">
            {storeName || 'POS ហាង'} · បង្កើតដោយ Rural POS
          </p>
        </div>
      </div>

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

      {/* Void confirmation — payment or opening balance */}
      {pendingVoid && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-6"
          onClick={() => { if (!voiding) { setPendingVoid(null); setOpenVoidId(null) } }}
          aria-hidden="true"
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl shadow-pop p-5 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-12 h-12 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} strokeWidth={2.25} />
            </div>
            <p className="text-[15px] font-bold text-slate-900 text-center">
              {pendingVoid.kind === 'payment' ? 'លុប​ការ​ទទួល​ប្រាក់​នេះ?' : 'លុប​បំណុលចាស់​នេះ?'}
            </p>
            <p className="text-[13px] text-slate-500 text-center mt-1.5 leading-relaxed">
              {pendingVoid.kind === 'payment' ? (
                <>លុយ <span className="font-bold text-danger-600 tabular-nums">{formatKHR(pendingVoid.amount)}</span> នឹង​ត្រឡប់​ចូល​បំណុល​អតិថិជន​វិញ ហើយ​កំណត់ត្រា​ការ​សង​នេះ​នឹង​ត្រូវ​លុប។</>
              ) : (
                <>បំណុល <span className="font-bold text-danger-600 tabular-nums">{formatKHR(pendingVoid.amount)}</span> នឹង​ត្រូវ​ដក​ចេញ​ពី​សមតុល្យ​អតិថិជន។ កំណត់ត្រា​បំណុលចាស់​នេះ​នឹង​ត្រូវ​លុប។</>
              )}
            </p>
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => { setPendingVoid(null); setOpenVoidId(null) }}
                disabled={voiding}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[14px] disabled:opacity-50 active:bg-slate-50 transition-colors"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={voiding}
                className="flex-1 h-11 rounded-xl bg-danger-600 text-white font-bold text-[14px] disabled:opacity-50 active:bg-danger-700 transition-colors"
              >
                {voiding ? 'កំពុង​លុប…' : 'បាទ/ចាស លុប'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
