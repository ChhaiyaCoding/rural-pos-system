'use client'

import { formatKHR } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import type { StoreDaySummary } from '@/services/cashDrawer.service'
import type { KHR } from '@/types/branded'

interface Props {
  summary: StoreDaySummary
}

/** Read-only daily store summary: sales breakdown, expenses, net profit. */
export function StoreDaySummaryView({ summary }: Props) {
  const profitPositive = summary.netProfit >= 0

  return (
    <div className="space-y-3">
      {/* Sales breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
        <Row label="លក់សរុប" value={summary.totalSales} strong />
        <Row label="💵 លក់សុទ្ធ (Cash)" value={summary.cashSales} tone="success" />
        <Row label="🏦 ABA" value={summary.abaSales} tone="primary" />
        <Row label="📋 ជំពាក់ (ឥណទាន)" value={summary.debtSales} tone="warning" />
      </div>

      {/* Expenses + profit */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
        <Row label="ចំណាយសរុប" value={summary.totalExpenses} tone="danger" prefix="−" />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[13px] font-bold text-slate-700">ចំណេញសុទ្ធ</span>
          <span className={[
            'text-[16px] font-extrabold tabular-nums',
            profitPositive ? 'text-success-700' : 'text-danger-700',
          ].join(' ')}>
            {profitPositive ? '' : '−'}{formatKHR(Math.abs(summary.netProfit) as KHR)}
          </span>
        </div>
      </div>

      {/* Opening cash + closing time */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden divide-y divide-slate-100">
        <Row label="ប្រាក់ដើមដំបូង" value={summary.openingCash} muted />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[12px] font-semibold text-slate-500">ពេលបិទ</span>
          <span className="text-[12px] font-bold text-slate-600">
            {summary.closedAt ? formatDateTimeKm(summary.closedAt) : 'កំពុងបើក'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({
  label, value, tone, strong, muted, prefix = '',
}: {
  label: string
  value: KHR
  tone?: 'success' | 'primary' | 'warning' | 'danger'
  strong?: boolean
  muted?: boolean
  prefix?: string
}) {
  const valueColor =
    tone === 'success' ? 'text-success-700'
    : tone === 'primary' ? 'text-primary-700'
    : tone === 'warning' ? 'text-warning-700'
    : tone === 'danger'  ? 'text-danger-700'
    : muted ? 'text-slate-500'
    : 'text-slate-900'

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={[
        strong ? 'text-[13px] font-bold text-slate-700' : 'text-[12px] font-semibold text-slate-500',
      ].join(' ')}>{label}</span>
      <span className={[
        strong ? 'text-[15px] font-extrabold' : 'text-[13px] font-bold',
        'tabular-nums', valueColor,
      ].join(' ')}>
        {prefix}{formatKHR(value)}
      </span>
    </div>
  )
}
