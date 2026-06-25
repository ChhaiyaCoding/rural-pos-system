'use client'

import { useState } from 'react'
import { X, ChevronDown, History } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { cashDrawerService } from '@/services/cashDrawer.service'
import type { StoreDaySummary } from '@/services/cashDrawer.service'
import { formatKHR } from '@/lib/money'
import { formatDateKm } from '@/lib/date'
import { StoreDaySummaryView } from './StoreDaySummaryView'
import type { CashDrawer } from '@/types'
import type { TenantId, KHR } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  onClose: () => void
}

interface Record {
  drawer:  CashDrawer
  summary: StoreDaySummary
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Store open/close history — past store-days with full daily summary. */
export function StoreHistorySheet({ onClose }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const records = useLiveQuery(async () => {
    const drawers = await cashDrawerService.getHistory(DEMO_TENANT)
    return Promise.all(
      drawers.map(async (drawer): Promise<Record> => ({
        drawer,
        summary: await cashDrawerService.getStoreDaySummary(drawer),
      })),
    )
  }, []) ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col shadow-pop animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <History size={19} className="text-slate-700" />
            <span className="text-[16px] font-bold text-slate-900">ប្រវត្តិបើក/បិទហាង</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={17} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-2.5">
          {records.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-slate-400">មិនទាន់មានប្រវត្តិហាងនៅឡើយ</p>
          ) : (
            records.map(({ drawer, summary }) => {
              const expanded = openId === drawer.id
              const isOpen   = !drawer.closedAt
              const profitPositive = summary.netProfit >= 0
              return (
                <div
                  key={drawer.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : drawer.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-slate-800">{formatDateKm(drawer.openedAt)}</p>
                        {isOpen && (
                          <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-200 rounded-full px-2 py-0.5">
                            បើក
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {drawer.cashierName} · {timeOnly(drawer.openedAt)}
                        {drawer.closedAt ? ` → ${timeOnly(drawer.closedAt)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400">ចំណេញ</p>
                      <p className={[
                        'text-[14px] font-extrabold tabular-nums',
                        profitPositive ? 'text-success-700' : 'text-danger-700',
                      ].join(' ')}>
                        {profitPositive ? '' : '−'}{formatKHR(Math.abs(summary.netProfit) as KHR)}
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={['shrink-0 text-slate-300 transition-transform', expanded ? 'rotate-180' : ''].join(' ')}
                    />
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 pt-1 bg-slate-50/60 border-t border-slate-100">
                      <StoreDaySummaryView summary={summary} />
                      {drawer.note && (
                        <p className="mt-2 text-[11px] text-slate-500 bg-white rounded-xl border border-slate-200 px-3 py-2">
                          📝 {drawer.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
