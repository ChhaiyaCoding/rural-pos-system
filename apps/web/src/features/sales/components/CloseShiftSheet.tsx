'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, History } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { cashDrawerService } from '@/services/cashDrawer.service'
import { addKHR } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import { StoreDaySummaryView } from './StoreDaySummaryView'
import { StoreHistorySheet } from './StoreHistorySheet'
import type { CashDrawer } from '@/types'

interface Props {
  drawer:   CashDrawer
  onClosed: (closed: CashDrawer) => void
  onClose:  () => void
}

export function CloseShiftSheet({ drawer, onClosed, onClose }: Props) {
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(false)
  const [closedData, setClosedData] = useState<CashDrawer | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  /* Live daily summary for this store-day */
  const summary = useLiveQuery(
    () => cashDrawerService.getStoreDaySummary(drawer),
    [drawer.id],
  )

  /* Duration */
  const openedAt   = new Date(drawer.openedAt)
  const now        = new Date()
  const durationMs = now.getTime() - openedAt.getTime()
  const hours      = Math.floor(durationMs / 3_600_000)
  const minutes    = Math.floor((durationMs % 3_600_000) / 60_000)
  const durationStr = hours > 0 ? `${hours} ម៉ោង ${minutes} នាទី` : `${minutes} នាទី`

  const handleClose = async () => {
    if (saving || !summary) return
    setSaving(true)
    try {
      // No advanced reconciliation: closing balance = opening + cash sales.
      const closingBalance = addKHR(drawer.openingBalance, summary.cashSales)
      const closeInput = note.trim()
        ? { drawerId: drawer.id, closingBalance, note: note.trim() }
        : { drawerId: drawer.id, closingBalance }
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
              <span className="text-[16px] font-bold">បិទហាង</span>
            </div>
            {!done && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-white/15 active:bg-white/25 text-[12px] font-semibold"
                >
                  <History size={14} /> ប្រវត្តិ
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
          <p className="text-[12px] opacity-70">
            {drawer.cashierName} · បើកតាំងពី {formatDateTimeKm(drawer.openedAt)} · {durationStr}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Success state */}
          {done && closedData && summary && (
            <div className="flex flex-col items-center justify-center py-8 px-5 gap-4">
              <div className="w-20 h-20 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                <CheckCircle2 size={44} strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-extrabold text-slate-900">បិទហាងជោគជ័យ!</p>
                <p className="text-[13px] text-slate-500 mt-1">{durationStr}</p>
              </div>
              <div className="w-full">
                <StoreDaySummaryView summary={{ ...summary, closedAt: closedData.closedAt }} />
              </div>
            </div>
          )}

          {/* Daily summary */}
          {!done && (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-medium">សង្ខេបប្រចាំថ្ងៃ</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {summary
                ? <StoreDaySummaryView summary={summary} />
                : <p className="py-10 text-center text-[12px] text-slate-400">កំពុងគណនា…</p>}

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
                disabled={saving || !summary}
                onClick={handleClose}
                className="w-full h-14 rounded-2xl bg-slate-800 text-white font-bold text-[15px] disabled:opacity-40 active:bg-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                {saving ? 'កំពុងបិទ…' : 'បិទហាង'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showHistory && <StoreHistorySheet onClose={() => setShowHistory(false)} />}
    </div>
  )
}
