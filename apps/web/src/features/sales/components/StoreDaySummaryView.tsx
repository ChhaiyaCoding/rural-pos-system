'use client'

import { formatKHR, addKHR } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import { cx } from '@/components/ui/cx'
import type { StoreDaySummary } from '@/services/cashDrawer.service'
import type { KHR } from '@/types/branded'

interface Props {
  summary: StoreDaySummary
}

/** Read-only daily store summary: cash / ABA / debt split, breakdown, net profit. */
export function StoreDaySummaryView({ summary }: Props) {
  const profitPositive = summary.netProfit >= 0
  const splitTotal = (summary.cashSales + summary.abaSales + summary.debtSales) as number
  const expectedCash = addKHR(summary.openingCash, summary.cashSales)

  return (
    <div className="space-y-3">
      {/* Cash / ABA / debt split */}
      {splitTotal > 0 && (
        <div className="flex h-3 overflow-hidden rounded-full bg-bg" role="img" aria-label="សាច់ប្រាក់ · ABA · ជំពាក់">
          {summary.cashSales > 0 && <span className="bg-chart-3" style={{ width: `${(summary.cashSales / splitTotal) * 100}%` }} />}
          {summary.abaSales  > 0 && <span className="bg-chart-1" style={{ width: `${(summary.abaSales  / splitTotal) * 100}%` }} />}
          {summary.debtSales > 0 && <span className="bg-chart-5" style={{ width: `${(summary.debtSales / splitTotal) * 100}%` }} />}
        </div>
      )}

      {/* Breakdown */}
      <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface">
        <Row label="ប្រាក់ដើមដំបូង"   value={summary.openingCash}   dot="bg-line-strong" />
        <Row label="លក់សុទ្ធ (Cash)" value={summary.cashSales}     dot="bg-chart-3" />
        <Row label="ABA"             value={summary.abaSales}      dot="bg-chart-1" />
        <Row label="ជំពាក់ (ឥណទាន)"  value={summary.debtSales}     dot="bg-chart-5" valueClass="text-debt" />
        <Row label="ចំណាយសរុប"       value={summary.totalExpenses} dot="bg-danger" valueClass="text-danger" prefix="−" />
        <div className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-3">
          <span className="text-body-sm font-semibold text-text">សាច់ប្រាក់គួរមានក្នុងថត</span>
          <span className="text-body font-bold tabular-nums text-text">{formatKHR(expectedCash)}</span>
        </div>
      </div>

      {/* Totals */}
      <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface">
        <Row label="លក់សរុប" value={summary.totalSales} strong />
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="text-body-sm font-bold text-text">ចំណេញសុទ្ធ</span>
          <span className={cx('text-title-sm font-bold tabular-nums', profitPositive ? 'text-success' : 'text-danger')}>
            {profitPositive ? '' : '−'}{formatKHR(Math.abs(summary.netProfit) as KHR)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-meta text-text-muted">ពេលបិទ</span>
          <span className="text-meta font-semibold text-text-subtle">
            {summary.closedAt ? formatDateTimeKm(summary.closedAt) : 'កំពុងបើក'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({
  label, value, dot, strong, valueClass, prefix = '',
}: {
  label: string
  value: KHR
  dot?: string
  strong?: boolean
  valueClass?: string
  prefix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className={cx('flex items-center gap-2', strong ? 'text-body-sm font-bold text-text' : 'text-body-sm text-text-subtle')}>
        {dot && <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', dot)} aria-hidden="true" />}
        {label}
      </span>
      <span className={cx('tabular-nums', strong ? 'text-body font-bold' : 'text-body-sm font-bold', valueClass ?? 'text-text')}>
        {prefix}{formatKHR(value)}
      </span>
    </div>
  )
}
