'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, History, Lock } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { MoneyText } from '@/components/ui/MoneyText'
import { cx } from '@/components/ui/cx'
import { useLiveQuery } from 'dexie-react-hooks'
import { cashDrawerService } from '@/services/cashDrawer.service'
import { addKHR, formatKHR } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import { StoreDaySummaryView } from './StoreDaySummaryView'
import { StoreHistorySheet } from './StoreHistorySheet'
import type { CashDrawer } from '@/types'
import type { KHR } from '@/types/branded'

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
    <>
      <Sheet
        open
        onClose={onClose}
        tone="bg"
        dismissible={!done}
        hideClose={done}
        title="បិទហាង"
        subtitle={`${drawer.cashierName} · បើកតាំងពី ${formatDateTimeKm(drawer.openedAt)} · ${durationStr}`}
        headerActions={
          !done ? (
            <Button variant="secondary" icon={<History size={18} strokeWidth={2.25} />} onClick={() => setShowHistory(true)}>
              ប្រវត្តិ
            </Button>
          ) : undefined
        }
        footer={
          !done ? (
            <Button
              variant="dark"
              size="xl"
              fullWidth
              disabled={saving || !summary}
              onClick={handleClose}
              icon={<Lock size={20} strokeWidth={2.25} className="text-accent" />}
            >
              {saving ? 'កំពុងបិទ…' : 'បិទហាង'}
            </Button>
          ) : undefined
        }
      >
        {/* Success state */}
        {done && closedData && summary && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-bg text-success" aria-hidden="true">
              <CheckCircle2 size={44} strokeWidth={1.75} />
            </div>
            <div className="text-center">
              <p className="text-title-sm font-bold text-text">បិទហាងជោគជ័យ!</p>
              <p className="mt-1 text-meta text-text-muted">{durationStr}</p>
            </div>
            <div className="w-full">
              <StoreDaySummaryView summary={{ ...summary, closedAt: closedData.closedAt }} />
            </div>
          </div>
        )}

        {/* Daily summary */}
        {!done && (
          <div className="space-y-4 pt-1">
            {summary ? (
              <>
                {/* Hero: total sales + net profit */}
                <div className="rounded-lg bg-ink-900 p-4 text-white">
                  <p className="text-meta font-semibold text-ink-300">លក់សរុប</p>
                  <MoneyText amount={summary.totalSales} size="lg" tone="onDark" />
                  <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-3">
                    <span className="text-body-sm font-semibold text-ink-300">ចំណេញសុទ្ធ</span>
                    <span
                      className={cx(
                        'text-title-sm font-bold tabular-nums',
                        summary.netProfit >= 0 ? 'text-accent' : 'text-debt-on-dark',
                      )}
                    >
                      {summary.netProfit >= 0 ? '' : '−'}{formatKHR(Math.abs(summary.netProfit) as KHR)}
                    </span>
                  </div>
                </div>

                <StoreDaySummaryView summary={summary} />
              </>
            ) : (
              <p className="py-10 text-center text-meta text-text-muted">កំពុងគណនា…</p>
            )}

            {/* Note */}
            <div className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-surface px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
              <label htmlFor="close-note" className="text-caption font-semibold text-text-subtle">កំណត់ចំណាំ (ស្រេចចិត្ត)</label>
              <input
                id="close-note"
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ឧ. ចំណាយ/ទំនិញ…"
                className="w-full bg-transparent text-body text-text outline-none placeholder:text-text-muted"
              />
            </div>
          </div>
        )}
      </Sheet>

      {showHistory && <StoreHistorySheet onClose={() => setShowHistory(false)} />}
    </>
  )
}
