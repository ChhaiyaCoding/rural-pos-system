'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, TrendingUp, Banknote, AlertTriangle } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { cashDrawerService } from '@/services/cashDrawer.service'
import { formatKHR, toKHR, addKHR } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import type { CashDrawer } from '@/types'
import type { KHR } from '@/types/branded'

interface Props {
  drawer:   CashDrawer
  onClosed: (closed: CashDrawer) => void
  onClose:  () => void
}

const QUICK_AMTS = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000]

export function CloseShiftSheet({ drawer, onClosed, onClose }: Props) {
  const [closing,    setClosing]    = useState('')
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(false)
  const [closedData, setClosedData] = useState<CashDrawer | null>(null)

  /* Live cash sales total for this shift */
  const cashSalesTotal = useLiveQuery(
    () => cashDrawerService.getLiveCashSales(drawer),
    [drawer.id]
  ) ?? (0 as KHR)

  const expectedBalance  = addKHR(drawer.openingBalance, cashSalesTotal)
  const closingAmt       = Math.max(0, Number(closing) || 0) as KHR
  const difference       = (closingAmt - expectedBalance) as KHR
  const hasClosing       = Number(closing) >= 0 && closing !== ''
  const isOver           = difference > 0
  const isShort          = difference < 0
  const isExact          = difference === 0 && hasClosing

  /* Duration */
  const openedAt   = new Date(drawer.openedAt)
  const now        = new Date()
  const durationMs = now.getTime() - openedAt.getTime()
  const hours      = Math.floor(durationMs / 3_600_000)
  const minutes    = Math.floor((durationMs % 3_600_000) / 60_000)
  const durationStr = hours > 0 ? `${hours} ម៉ោង ${minutes} នាទី` : `${minutes} នាទី`

  const handleClose = async () => {
    if (!hasClosing || saving) return
    setSaving(true)
    try {
      const closeInput = note.trim()
        ? { drawerId: drawer.id, closingBalance: toKHR(closingAmt) as KHR, note: note.trim() }
        : { drawerId: drawer.id, closingBalance: toKHR(closingAmt) as KHR }
      const result = await cashDrawerService.close(closeInput)
      if (result) {
        setClosedData(result)
        setDone(true)
      }
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!done || !closedData) return
    const t = setTimeout(() => onClosed(closedData), 2500)
    return () => clearTimeout(t)
  }, [done, closedData])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/70"
      onClick={!done ? onClose : undefined}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 bg-slate-800 px-5 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} strokeWidth={2} />
              <span className="text-[16px] font-bold">បិទវេន</span>
            </div>
            {!done && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <p className="text-[12px] opacity-70">
            {drawer.cashierName} · បើកតាំងពី {formatDateTimeKm(drawer.openedAt)} · {durationStr}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Success state */}
          {done && closedData && (
            <div className="flex flex-col items-center justify-center py-10 px-6 gap-4">
              <div className="w-20 h-20 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                <CheckCircle2 size={44} strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-extrabold text-slate-900">បិទវេនជោគជ័យ!</p>
                <p className="text-[13px] text-slate-500 mt-1">
                  ចំណូល {formatKHR(closedData.cashSalesTotal ?? 0 as KHR)} · {durationStr}
                </p>
              </div>
              {closedData.difference !== null && closedData.difference !== 0 && (
                <div className={[
                  'rounded-xl px-4 py-3 text-center w-full',
                  (closedData.difference ?? 0) > 0 ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200',
                ].join(' ')}>
                  <p className="text-[12px] font-semibold text-slate-600">
                    {(closedData.difference ?? 0) > 0 ? '✅ លើស' : '⚠️ ខ្វះ'}
                  </p>
                  <p className={[
                    'text-[18px] font-extrabold tabular-nums',
                    (closedData.difference ?? 0) > 0 ? 'text-success-700' : 'text-danger-700',
                  ].join(' ')}>
                    {formatKHR(Math.abs(closedData.difference ?? 0) as KHR)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Main form */}
          {!done && (
            <div className="px-5 py-4 space-y-4">

              {/* Shift summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">ចាប់ផ្ដើម</p>
                  <p className="text-[13px] font-extrabold text-slate-800 tabular-nums">
                    {formatKHR(drawer.openingBalance)}
                  </p>
                </div>
                <div className="rounded-xl bg-success-50 border border-success-200 px-3 py-3">
                  <p className="text-[9px] font-bold text-success-500 uppercase mb-1">លក់ Cash</p>
                  <p className="text-[13px] font-extrabold text-success-800 tabular-nums">
                    +{formatKHR(cashSalesTotal)}
                  </p>
                </div>
                <div className="rounded-xl bg-primary-50 border border-primary-200 px-3 py-3">
                  <p className="text-[9px] font-bold text-primary-500 uppercase mb-1">គួរមាន</p>
                  <p className="text-[13px] font-extrabold text-primary-800 tabular-nums">
                    {formatKHR(expectedBalance)}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-medium">រាប់ប្រាក់ពិតប្រាកដ</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Actual closing amount */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-2">ប្រាក់ដែលបានរាប់ (រៀល)</p>
                <div className={[
                  'flex items-center border-2 rounded-2xl overflow-hidden transition-colors',
                  hasClosing
                    ? isOver ? 'border-success-400 bg-success-50'
                    : isShort ? 'border-danger-400 bg-danger-50'
                    : 'border-slate-300 bg-slate-50'
                    : 'border-slate-300 bg-slate-50',
                ].join(' ')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={closing}
                    onChange={e => setClosing(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleClose()}
                    placeholder="0"
                    autoFocus
                    className="flex-1 h-14 px-5 text-[22px] font-extrabold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none tabular-nums"
                  />
                  <span className="pr-5 text-[15px] font-bold text-slate-400">៛</span>
                </div>

                {/* Difference badge */}
                {hasClosing && (
                  <div className={[
                    'mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5',
                    isExact  ? 'bg-success-50 border border-success-200'
                    : isOver ? 'bg-success-50 border border-success-200'
                    : 'bg-danger-50 border border-danger-200',
                  ].join(' ')}>
                    {isShort
                      ? <AlertTriangle size={15} className="text-danger-600 shrink-0" />
                      : <CheckCircle2 size={15} className="text-success-600 shrink-0" />
                    }
                    <div className="flex-1">
                      <span className="text-[12px] font-semibold text-slate-600">
                        {isExact ? '✓ ត្រឹមត្រូវ!'
                        : isOver ? `លើស ${formatKHR(difference as KHR)}`
                        : `ខ្វះ ${formatKHR(Math.abs(difference) as KHR)}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">គួរមាន</p>
                      <p className="text-[12px] font-bold text-slate-700 tabular-nums">
                        {formatKHR(expectedBalance)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setClosing(String(amt))}
                    className={[
                      'h-8 px-3 rounded-xl border text-[11px] font-bold transition-colors',
                      closing === String(amt)
                        ? 'bg-slate-800 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-600 active:bg-slate-50',
                    ].join(' ')}
                  >
                    {formatKHR(toKHR(amt) as KHR)}
                  </button>
                ))}
                {/* Exact button */}
                <button
                  type="button"
                  onClick={() => setClosing(String(expectedBalance))}
                  className={[
                    'h-8 px-3 rounded-xl border text-[11px] font-bold transition-colors',
                    closing === String(expectedBalance)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-primary-50 border-primary-200 text-primary-700 active:bg-primary-100',
                  ].join(' ')}
                >
                  ✓ ត្រឹម {formatKHR(expectedBalance)}
                </button>
              </div>

              {/* Note */}
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1.5">កំណត់ចំណាំ (ស្រេចចិត្ត)</p>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="ឧ. ចំណាយ/ទំនិញ…"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-[13px] placeholder:text-slate-300 focus:outline-none focus:border-primary-400"
                />
              </div>

              {/* Confirm */}
              <button
                type="button"
                disabled={!hasClosing || saving}
                onClick={handleClose}
                className="w-full h-14 rounded-2xl bg-slate-800 text-white font-bold text-[15px] disabled:opacity-40 active:bg-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                {saving ? 'កំពុងបិទ…' : 'បិទវេន'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
