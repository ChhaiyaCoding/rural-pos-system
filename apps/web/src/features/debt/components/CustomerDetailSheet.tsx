'use client'

import { useState, useMemo, useRef } from 'react'
import { X, Phone, MapPin, ArrowDownLeft, ArrowUpRight, Banknote, Pencil, CheckCircle2, ChevronRight, Share2, ImageDown, Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { debtService } from '@/services/debt.service'
import { formatKHR, toKHR } from '@/lib/money'
import { formatDateTimeKm, nowISO } from '@/lib/date'
import { useStoreProfile } from '@/store/storeProfile.store'
import { CustomerEditSheet } from './CustomerEditSheet'
import type { Customer, DebtTransaction } from '@/types'
import type { TenantId, CustomerId, KHR } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  customer: Customer
  onClose: () => void
}

/* ── Quick-amount presets ────────────────────────────────── */
const QUICK_AMTS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000]

export function CustomerDetailSheet({ customer, onClose }: Props) {
  const [payAmount,   setPayAmount]   = useState('')
  const [paying,      setPaying]      = useState(false)
  const [showPay,     setShowPay]     = useState(false)
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

  /* Parsed + clamped input */
  const parsedAmt  = Number(payAmount) || 0
  const clampedAmt = Math.min(parsedAmt, live.debtBalance)
  const isOverpay  = parsedAmt > live.debtBalance && parsedAmt > 0
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
      })
      if (result.ok) {
        const after = Math.max(0, live.debtBalance - clampedAmt) as KHR
        setPaySuccess({ paid: toKHR(clampedAmt) as KHR, after })
        setPayAmount('')
        setShowPay(false)
      }
    } finally {
      setPaying(false)
    }
  }

  /* ── Dismiss success banner after 4 s ───────────────── */
  const dismissSuccess = () => setPaySuccess(null)

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
              {capturing ? '…' : shareOk ? 'Done!' : 'Share'}
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
                'text-[20px] font-extrabold tabular-nums transition-all duration-500',
                hasDebt ? 'text-danger-600' : 'text-success-600',
              ].join(' ')}>
                {formatKHR(live.debtBalance)}
              </p>
            </div>
          </div>

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
                onClick={() => setShowPay(true)}
                className="w-full h-13 rounded-2xl bg-success-600 text-white font-bold text-[15px] flex items-center justify-center gap-2.5 active:bg-success-700 transition-colors py-3.5"
              >
                <Banknote size={20} strokeWidth={2} />
                ទទួលប្រាក់បំណុល
                <ChevronRight size={16} className="opacity-70" />
              </button>
            </div>
          )}

          {/* ─ Payment form ─────────────────────────── */}
          {showPay && (
            <div className="mx-4 mt-4 rounded-2xl border border-success-200 bg-success-50 px-4 py-4">

              {/* Label + max */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-success-700">ចំនួនប្រាក់ទទួល (រៀល)</p>
                <p className="text-[11px] text-slate-500 tabular-nums">
                  ជំពាក់ {formatKHR(live.debtBalance)}
                </p>
              </div>

              {/* Amount input */}
              <div className="flex gap-2">
                <div className={[
                  'flex-1 flex items-center border rounded-xl bg-white overflow-hidden transition-colors',
                  isOverpay ? 'border-warning-400' : 'border-success-300',
                ].join(' ')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                    placeholder="0"
                    autoFocus
                    className="flex-1 h-12 px-4 text-[18px] font-bold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none"
                  />
                  <span className="pr-3 text-[14px] text-slate-400">៛</span>
                </div>
                <button
                  type="button"
                  disabled={!canPay}
                  onClick={handlePay}
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

              {/* Overpay warning */}
              {isOverpay && (
                <p className="mt-1.5 text-[11px] text-warning-700 font-semibold">
                  ⚠ ចំនួនលើសបំណុល — នឹងទទួល {formatKHR(toKHR(clampedAmt))} ជំនួស
                </p>
              )}

              {/* Quick amount chips */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {QUICK_AMTS.filter(a => a <= live.debtBalance).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPayAmount(String(amt))}
                    className={[
                      'h-8 px-3 rounded-lg border text-[12px] font-semibold transition-colors',
                      payAmount === String(amt)
                        ? 'bg-success-600 border-success-600 text-white'
                        : 'bg-white border-success-200 text-success-700 active:bg-success-100',
                    ].join(' ')}
                  >
                    {formatKHR(toKHR(amt))}
                  </button>
                ))}
                {/* Full payment button */}
                <button
                  type="button"
                  onClick={() => setPayAmount(String(live.debtBalance))}
                  className={[
                    'h-8 px-3 rounded-lg border text-[12px] font-bold transition-colors',
                    payAmount === String(live.debtBalance)
                      ? 'bg-success-600 border-success-600 text-white'
                      : 'bg-success-100 border-success-300 text-success-800 active:bg-success-200',
                  ].join(' ')}
                >
                  ✓ សងទាំងអស់ {formatKHR(live.debtBalance)}
                </button>
              </div>
            </div>
          )}

          {/* ─ Transaction ledger ────────────────────── */}
          <div className="mt-4">
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                ប្រវត្តិប្រតិបត្តិការ
              </p>
              {txns.length > 0 && (
                <p className="text-[11px] text-slate-400">{txns.length} ដង</p>
              )}
            </div>

            {txnsWithBalance.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-slate-400">មិនទាន់មានប្រវត្តិ</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 pb-6">
                {txnsWithBalance.map((txn) => {
                  const isPayment = txn.type === 'payment'
                  return (
                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5">
                      {/* Type icon */}
                      <div className={[
                        'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                        isPayment ? 'bg-success-100' : 'bg-danger-100',
                      ].join(' ')}>
                        {isPayment
                          ? <ArrowUpRight  size={16} className="text-success-600" />
                          : <ArrowDownLeft size={16} className="text-danger-600" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800">
                          {isPayment ? 'ទទួលប្រាក់' : 'ជំពាក់ (ការលក់)'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDateTimeKm(txn.createdAt)}
                        </p>
                      </div>

                      {/* Amount + running balance */}
                      <div className="shrink-0 text-right">
                        <p className={[
                          'text-[14px] font-bold tabular-nums',
                          isPayment ? 'text-success-600' : 'text-danger-600',
                        ].join(' ')}>
                          {isPayment ? '−' : '+'}{formatKHR(txn.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                          នៅ {formatKHR(txn.runningBalance)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
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
              'text-[22px] font-extrabold tabular-nums',
              live.debtBalance > 0 ? 'text-danger-600' : 'text-success-600',
            ].join(' ')}>
              {formatKHR(live.debtBalance)}
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
              'text-[18px] font-extrabold tabular-nums',
              live.debtBalance > 0 ? 'text-danger-600' : 'text-success-600',
            ].join(' ')}>
              {live.debtBalance > 0 ? formatKHR(live.debtBalance) : '✅ អស់ហើយ'}
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
    </div>
  )
}
