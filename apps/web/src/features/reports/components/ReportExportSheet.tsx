'use client'

import { useRef } from 'react'
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react'
import { formatKHR } from '@/lib/money'
import type { KHR } from '@/types/branded'

interface TopProduct {
  name: string
  qty: number
  revenue: number
}

interface Props {
  onClose:      () => void
  periodLabel:  string
  storeName:    string
  totalRevenue: KHR
  salesCount:   number
  cashCount:    number
  cashAmount:   KHR
  debtCount:    number
  debtAmount:   KHR
  debtorCount:  number
  totalDebt:    KHR
  topProducts:  TopProduct[]
  dateRange:    string
}

export function ReportExportSheet({
  onClose,
  periodLabel,
  storeName,
  totalRevenue,
  salesCount,
  cashCount,
  cashAmount,
  debtCount,
  debtAmount,
  debtorCount,
  totalDebt,
  topProducts,
  dateRange,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const today   = new Date().toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' })

  /* ── Print ─────────────────────────────────────────── */
  const handlePrint = () => {
    const content = cardRef.current
    if (!content) return

    const printWin = window.open('', '_blank', 'width=400,height=600')
    if (!printWin) return

    printWin.document.write(`
      <html>
      <head>
        <title>របាយការណ៍ ${periodLabel}</title>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Khmer OS', 'Noto Sans Khmer', sans-serif; padding: 24px; color: #1e293b; }
          .card { max-width: 360px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
          .store { font-size: 20px; font-weight: 800; }
          .period { font-size: 13px; color: #64748b; margin-top: 4px; }
          .date { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
          .big-num { font-size: 28px; font-weight: 800; color: #0f172a; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .label { font-size: 13px; color: #475569; }
          .value { font-size: 14px; font-weight: 700; color: #1e293b; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
          .cash { background: #f0fdf4; color: #16a34a; }
          .debt { background: #fef2f2; color: #dc2626; }
          .rank { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 10px; font-weight: 700; text-align: center; line-height: 18px; margin-right: 6px; }
          .rank.gold { background: #fbbf24; color: white; }
          .rank.silver { background: #94a3b8; color: white; }
          .rank.bronze { background: #d97706; color: white; }
          .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="store">${storeName}</div>
            <div class="period">របាយការណ៍ ${periodLabel}</div>
            <div class="date">${dateRange}</div>
          </div>

          <div class="section">
            <div class="section-title">ចំណូលសរុប</div>
            <div class="big-num">${formatKHR(totalRevenue)}</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px">${salesCount} ការលក់</div>
          </div>

          <div class="section">
            <div class="section-title">របៀបទូទាត់</div>
            <div class="row">
              <span class="label">💵 សាច់ប្រាក់</span>
              <span><span class="badge cash">${cashCount} ដង</span> <span class="value">${formatKHR(cashAmount)}</span></span>
            </div>
            <div class="row">
              <span class="label">📒 ជំពាក់</span>
              <span><span class="badge debt">${debtCount} ដង</span> <span class="value">${formatKHR(debtAmount)}</span></span>
            </div>
          </div>

          ${topProducts.length > 0 ? `
          <div class="section">
            <div class="section-title">ទំនិញលក់ច្រើន</div>
            ${topProducts.slice(0, 5).map((p, i) => `
              <div class="row">
                <span>
                  <span class="rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                  <span class="label">${p.name}</span>
                </span>
                <span class="value">${formatKHR(p.revenue as KHR)}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${debtorCount > 0 ? `
          <div class="section">
            <div class="section-title">បំណុលអតិថិជន</div>
            <div class="row">
              <span class="label">👥 ${debtorCount} នាក់ជំពាក់</span>
              <span class="value" style="color:#dc2626">${formatKHR(totalDebt)}</span>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            ថ្ងៃទី ${today}<br/>
            Rural POS System
          </div>
        </div>
      </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => { printWin.print(); printWin.close() }, 300)
  }

  /* ── Share (Web Share API) ─────────────────────────── */
  const handleShare = async () => {
    const top5 = topProducts.slice(0, 5)
      .map((p, i) => `  ${i + 1}. ${p.name} — ${formatKHR(p.revenue as KHR)}`)
      .join('\n')

    const text = [
      `📊 របាយការណ៍${periodLabel} — ${storeName}`,
      `📅 ${dateRange}`,
      ``,
      `💰 ចំណូលសរុប: ${formatKHR(totalRevenue)}`,
      `🛒 ការលក់: ${salesCount} ដង`,
      ``,
      `💵 សាច់ប្រាក់: ${cashCount} ដង · ${formatKHR(cashAmount)}`,
      `📒 ជំពាក់: ${debtCount} ដង · ${formatKHR(debtAmount)}`,
      top5 ? `\n🏆 ទំនិញលក់ច្រើន:\n${top5}` : '',
      debtorCount > 0 ? `\n👥 បំណុលសរុប: ${formatKHR(totalDebt)} (${debtorCount} នាក់)` : '',
      ``,
      `📱 Rural POS System`,
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: `របាយការណ៍ ${storeName}`, text })
      } catch { /* user cancelled */ }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text)
      alert('Copy ទៅ Clipboard ហើយ! Paste ក្នុង WhatsApp/Telegram')
    }
  }

  /* ─────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/70"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <span className="text-[15px] font-bold text-slate-900">📤 Export របាយការណ៍</span>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Report preview card */}
          <div ref={cardRef} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">

            {/* Card header */}
            <div className="bg-primary-600 px-5 py-4 text-white text-center">
              <p className="text-[18px] font-extrabold">{storeName}</p>
              <p className="text-[13px] opacity-80 mt-0.5">របាយការណ៍ {periodLabel}</p>
              <p className="text-[11px] opacity-60 mt-0.5">{dateRange}</p>
            </div>

            {/* Revenue */}
            <div className="px-5 py-4 border-b border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ចំណូលសរុប</p>
              <p className="text-[32px] font-extrabold text-slate-900 tabular-nums">{formatKHR(totalRevenue)}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{salesCount} ការលក់</p>
            </div>

            {/* Payment breakdown */}
            <div className="px-5 py-3 border-b border-slate-100 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">របៀបទូទាត់</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">💵</span>
                  <span className="text-[13px] font-semibold text-slate-700">សាច់ប្រាក់</span>
                  <span className="text-[11px] text-slate-400">{cashCount} ដង</span>
                </div>
                <span className="text-[14px] font-bold text-success-700 tabular-nums">{formatKHR(cashAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📒</span>
                  <span className="text-[13px] font-semibold text-slate-700">ជំពាក់</span>
                  <span className="text-[11px] text-slate-400">{debtCount} ដង</span>
                </div>
                <span className="text-[14px] font-bold text-danger-600 tabular-nums">{formatKHR(debtAmount)}</span>
              </div>
            </div>

            {/* Top products */}
            {topProducts.length > 0 && (
              <div className="px-5 py-3 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ទំនិញលក់ច្រើន</p>
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={[
                        'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white',
                        i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-200',
                      ].join(' ')} style={i >= 3 ? { color: '#64748b' } : {}}>
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-semibold text-slate-700 truncate">{p.name}</span>
                    </div>
                    <span className="text-[12px] font-bold text-slate-700 tabular-nums shrink-0 ml-2">
                      {formatKHR(p.revenue as KHR)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Debt summary */}
            {debtorCount > 0 && (
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-bold text-danger-700">👥 បំណុលអតិថិជន</p>
                    <p className="text-[10px] text-slate-400">{debtorCount} នាក់ជំពាក់</p>
                  </div>
                  <p className="text-[16px] font-extrabold text-danger-700 tabular-nums">{formatKHR(totalDebt)}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 text-center">
              <p className="text-[10px] text-slate-400">ថ្ងៃទី {today} · Rural POS System</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pb-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-13 py-3.5 rounded-2xl bg-slate-800 text-white font-bold text-[14px] flex items-center justify-center gap-2 active:bg-slate-900 transition-colors"
            >
              <Printer size={18} strokeWidth={2} />
              Print
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="h-13 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 active:bg-primary-700 transition-colors"
            >
              <Share2 size={18} strokeWidth={2} />
              Share
            </button>
          </div>

          {/* Screenshot tip */}
          <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
            <CheckCircle2 size={15} className="text-primary-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">Tip:</span> ថតរូបអេក្រង់ (Screenshot) Report Card ខាងលើ → ផ្ញើ WhatsApp / Telegram បានភ្លាម!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
