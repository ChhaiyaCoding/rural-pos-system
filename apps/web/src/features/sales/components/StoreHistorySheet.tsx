'use client'

import { useState } from 'react'
import { ChevronDown, History, StickyNote } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Pill } from '@/components/ui/Pill'
import { EmptyState } from '@/components/ui/EmptyState'
import { cx } from '@/components/ui/cx'
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
    <Sheet open onClose={onClose} tone="bg" title="ប្រវត្តិបើក/បិទហាង">
      {records.length === 0 ? (
        <EmptyState icon={<History size={30} strokeWidth={1.5} />} title="មិនទាន់មានប្រវត្តិហាងនៅឡើយ" />
      ) : (
        <div className="space-y-2.5 pb-2">
          {records.map(({ drawer, summary }) => {
            const expanded = openId === drawer.id
            const isOpen   = !drawer.closedAt
            const profitPositive = summary.netProfit >= 0
            return (
              <div key={drawer.id} className="overflow-hidden rounded-lg bg-surface">
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : drawer.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-body-sm font-bold text-text">{formatDateKm(drawer.openedAt)}</p>
                      {isOpen && <Pill variant="success">បើក</Pill>}
                    </div>
                    <p className="mt-0.5 text-meta text-text-muted">
                      {drawer.cashierName} · {timeOnly(drawer.openedAt)}
                      {drawer.closedAt ? ` → ${timeOnly(drawer.closedAt)}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-caption text-text-muted">ចំណេញ</p>
                    <p className={cx('text-body-sm font-bold tabular-nums', profitPositive ? 'text-success' : 'text-danger')}>
                      {profitPositive ? '' : '−'}{formatKHR(Math.abs(summary.netProfit) as KHR)}
                    </p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={cx('shrink-0 text-nav-off transition-transform', expanded && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>

                {expanded && (
                  <div className="border-t border-line bg-bg/60 p-3">
                    <StoreDaySummaryView summary={summary} />
                    {drawer.note && (
                      <p className="mt-2 flex items-start gap-2 rounded-md bg-surface px-3 py-2 text-meta text-text-subtle">
                        <StickyNote size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{drawer.note}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
