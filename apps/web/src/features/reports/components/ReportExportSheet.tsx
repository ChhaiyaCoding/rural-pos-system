'use client'

import { useRef } from 'react'
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react'
import { formatKHR, formatUSD } from '@/lib/money'
import { expenseCategoryLabel, expenseCategoryEmoji } from '@/services/expense.service'
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
  totalExpenses: KHR
  netProfit:    KHR
  salesCount:   number
  cashCount:    number
  cashAmount:   KHR
  debtCount:    number
  debtAmount:   KHR
  debtorCount:  number
  totalDebt:    KHR
  topProducts:  TopProduct[]
  expenseByCat: [string, number][]
  dateRange:    string
}

export function ReportExportSheet({
  onClose,
  periodLabel,
  storeName,
  totalRevenue,
  totalExpenses,
  netProfit,
  salesCount,
  cashCount,
  cashAmount,
  debtCount,
  debtAmount,
  debtorCount,
  totalDebt,
  topProducts,
  expenseByCat,
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&display=swap" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Kantumruy Pro', 'Khmer OS', 'Noto Sans Khmer', sans-serif; line-height: 1.5; padding: 24px; color: #0F1B2D; }
          .card { max-width: 360px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #E2E6EC; padding-bottom: 16px; margin-bottom: 16px; }
          .store { font-size: 20px; font-weight: 800; }
          .period { font-size: 13px; color: #5A6676; margin-top: 4px; }
          .date { font-size: 11px; color: #5A6676; margin-top: 2px; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 10px; font-weight: 700; color: #5A6676; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
          .big-num { font-size: 28px; font-weight: 800; color: #0F1B2D; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #EEF1F5; }
          .label { font-size: 13px; color: #3E4A5C; }
          .value { font-size: 14px; font-weight: 700; color: #0F1B2D; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
          .cash { background: #DDF5EA; color: #067A55; }
          .debt { background: #FFEBE2; color: #B93815; }
          .rank { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #EEF1F5; color: #3E4A5C; font-size: 10px; font-weight: 700; text-align: center; line-height: 18px; margin-right: 6px; }
          .rank.gold { background: #FFB020; color: #0F1B2D; }
          .rank.silver { background: #D3D9E1; color: #0F1B2D; }
          .rank.bronze { background: #F5EAD2; color: #7E5A10; }
          .footer { text-align: center; font-size: 10px; color: #5A6676; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #E2E6EC; }
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
            <div style="font-size:15px;color:#3E4A5C;font-weight:700;margin-top:2px">${formatUSD(totalRevenue)}</div>
            <div style="font-size:13px;color:#5A6676;margin-top:4px">${salesCount} ការលក់</div>
          </div>

          <div class="section">
            <div class="section-title">ចំណេញសុទ្ធ</div>
            <div style="display:flex;gap:10px;margin-bottom:8px">
              <div style="flex:1;background:#DDF5EA;border:1px solid #DDF5EA;border-radius:10px;padding:8px 10px">
                <div style="font-size:11px;color:#067A55;font-weight:600">ចំណូល</div>
                <div style="font-size:15px;color:#067A55;font-weight:800">${formatKHR(totalRevenue)}</div>
                <div style="font-size:11px;color:#3E4A5C;font-weight:700">${formatUSD(totalRevenue)}</div>
              </div>
              <div style="flex:1;background:#FFEBE2;border:1px solid #FFEBE2;border-radius:10px;padding:8px 10px">
                <div style="font-size:11px;color:#B93815;font-weight:600">ចំណាយ</div>
                <div style="font-size:15px;color:#B93815;font-weight:800">${formatKHR(totalExpenses)}</div>
                <div style="font-size:11px;color:#3E4A5C;font-weight:700">${formatUSD(totalExpenses)}</div>
              </div>
            </div>
            <div class="row" style="border-top:1px solid #E2E6EC;padding-top:6px"><span class="label" style="font-weight:700">ចំណេញសុទ្ធ</span><span class="value" style="color:${(netProfit as number) >= 0 ? '#067A55' : '#B42318'};font-weight:800;font-size:16px">${formatKHR(netProfit)} · ${formatUSD(netProfit)}</span></div>
          </div>

          ${expenseByCat.length > 0 ? `
          <div class="section">
            <div class="section-title">ចំណាយតាមប្រភេទ</div>
            ${expenseByCat.map(([cat, amt]) => `
              <div class="row">
                <span class="label">${expenseCategoryEmoji(cat)} ${expenseCategoryLabel(cat)}</span>
                <span class="value" style="color:#B93815">${formatKHR(amt as KHR)}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">របៀបទូទាត់</div>
            <div class="row">
              <span class="label">💵 សាច់ប្រាក់</span>
              <span><span class="badge cash">${cashCount} ដង</span> <span class="value">${formatKHR(cashAmount)} · ${formatUSD(cashAmount)}</span></span>
            </div>
            <div class="row">
              <span class="label">📒 ជំពាក់</span>
              <span><span class="badge debt">${debtCount} ដង</span> <span class="value">${formatKHR(debtAmount)} · ${formatUSD(debtAmount)}</span></span>
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
                <span class="value">${formatKHR(p.revenue as KHR)} · ${formatUSD(p.revenue as KHR)}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${debtorCount > 0 ? `
          <div class="section">
            <div class="section-title">បំណុលអតិថិជន</div>
            <div class="row">
              <span class="label">👥 ${debtorCount} នាក់ជំពាក់</span>
              <span class="value" style="color:#B93815">${formatKHR(totalDebt)} · ${formatUSD(totalDebt)}</span>
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
      .map((p, i) => `  ${i + 1}. ${p.name} — ${formatKHR(p.revenue as KHR)} · ${formatUSD(p.revenue as KHR)}`)
      .join('\n')
    const catLines = expenseByCat
      .map(([cat, amt]) => `  ${expenseCategoryEmoji(cat)} ${expenseCategoryLabel(cat)} — ${formatKHR(amt as KHR)}`)
      .join('\n')

    const text = [
      `📊 របាយការណ៍${periodLabel} — ${storeName}`,
      `📅 ${dateRange}`,
      ``,
      `💰 ចំណូលសរុប: ${formatKHR(totalRevenue)} · ${formatUSD(totalRevenue)}`,
      `🛒 ការលក់: ${salesCount} ដង`,
      ``,
      `💸 ចំណាយ: ${formatKHR(totalExpenses)} · ${formatUSD(totalExpenses)}`,
      `📈 ចំណេញ: ${formatKHR(netProfit)} · ${formatUSD(netProfit)}`,
      catLines ? `\n💸 ចំណាយតាមប្រភេទ:\n${catLines}` : '',
      ``,
      `💵 សាច់ប្រាក់: ${cashCount} ដង · ${formatKHR(cashAmount)} · ${formatUSD(cashAmount)}`,
      `📒 ជំពាក់: ${debtCount} ដង · ${formatKHR(debtAmount)} · ${formatUSD(debtAmount)}`,
      top5 ? `\n🏆 ទំនិញលក់ច្រើន:\n${top5}` : '',
      debtorCount > 0 ? `\n👥 បំណុលសរុប: ${formatKHR(totalDebt)} · ${formatUSD(totalDebt)} (${debtorCount} នាក់)` : '',
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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/60"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-line">
          <span className="text-body-sm font-bold text-text">📤 Export របាយការណ៍</span>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-muted active:bg-line">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Report preview card */}
          <div ref={cardRef} className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">

            {/* Card header */}
            <div className="bg-ink-900 px-5 py-4 text-white text-center">
              <p className="text-title-sm font-extrabold">{storeName}</p>
              <p className="text-meta opacity-80 mt-0.5">របាយការណ៍ {periodLabel}</p>
              <p className="text-caption opacity-60 mt-0.5">{dateRange}</p>
            </div>

            {/* Revenue */}
            <div className="px-5 py-4 border-b border-line text-center">
              <p className="text-caption font-bold text-text-muted uppercase tracking-wider mb-1">ចំណូលសរុប</p>
              <p className="text-amount font-extrabold text-text tabular-nums">{formatKHR(totalRevenue)}</p>
              <p className="text-body-sm font-bold text-text-subtle tabular-nums">{formatUSD(totalRevenue)}</p>
              <p className="text-caption text-text-muted mt-0.5">{salesCount} ការលក់</p>
            </div>

            {/* Profit summary: revenue / expenses cards + net profit */}
            <div className="px-5 py-4 border-b border-line">
              <p className="text-caption font-bold text-text-muted uppercase tracking-wider mb-2.5">ចំណេញ​សុទ្ធ</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-success-bg border border-success-bg px-3 py-2.5">
                  <p className="text-caption font-semibold text-success mb-0.5">ចំណូល</p>
                  <p className="text-body-sm font-extrabold text-success tabular-nums leading-tight">{formatKHR(totalRevenue)}</p>
                  <p className="text-caption font-bold text-text-subtle tabular-nums">{formatUSD(totalRevenue)}</p>
                </div>
                <div className="rounded-xl bg-debt-bg border border-debt-bg px-3 py-2.5">
                  <p className="text-caption font-semibold text-debt mb-0.5">ចំណាយ</p>
                  <p className="text-body-sm font-extrabold text-debt tabular-nums leading-tight">{formatKHR(totalExpenses)}</p>
                  <p className="text-caption font-bold text-text-subtle tabular-nums">{formatUSD(totalExpenses)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-meta font-bold text-text-muted">ចំណេញ​សុទ្ធ</span>
                <div className="text-right">
                  <span className={['block text-title font-extrabold tabular-nums leading-tight', (netProfit as number) >= 0 ? 'text-success' : 'text-danger'].join(' ')}>{formatKHR(netProfit)}</span>
                  <span className="block text-caption font-bold text-text-subtle tabular-nums">{formatUSD(netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Expense breakdown by category */}
            {expenseByCat.length > 0 && (
              <div className="px-5 py-3 border-b border-line space-y-2">
                <p className="text-caption font-bold text-text-muted uppercase tracking-wider">ចំណាយ​តាម​ប្រភេទ</p>
                {expenseByCat.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-caption font-semibold text-text-subtle">{expenseCategoryEmoji(cat)} {expenseCategoryLabel(cat)}</span>
                    <span className="text-caption font-bold text-debt tabular-nums">{formatKHR(amt as KHR)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment breakdown */}
            <div className="px-5 py-3 border-b border-line space-y-2">
              <p className="text-caption font-bold text-text-muted uppercase tracking-wider">របៀបទូទាត់</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-body">💵</span>
                  <span className="text-meta font-semibold text-text-subtle">សាច់ប្រាក់</span>
                  <span className="text-caption text-text-muted">{cashCount} ដង</span>
                </div>
                <span className="text-right">
                  <span className="block text-body-sm font-bold text-success tabular-nums">{formatKHR(cashAmount)}</span>
                  <span className="block text-caption font-bold text-text-subtle tabular-nums">{formatUSD(cashAmount)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-body">📒</span>
                  <span className="text-meta font-semibold text-text-subtle">ជំពាក់</span>
                  <span className="text-caption text-text-muted">{debtCount} ដង</span>
                </div>
                <span className="text-right">
                  <span className="block text-body-sm font-bold text-debt tabular-nums">{formatKHR(debtAmount)}</span>
                  <span className="block text-caption font-bold text-text-subtle tabular-nums">{formatUSD(debtAmount)}</span>
                </span>
              </div>
            </div>

            {/* Top products */}
            {topProducts.length > 0 && (
              <div className="px-5 py-3 border-b border-line space-y-2">
                <p className="text-caption font-bold text-text-muted uppercase tracking-wider">ទំនិញលក់ច្រើន</p>
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={[
                        'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-caption font-black',
                        i === 0 ? 'bg-accent text-ink-900' : i === 1 ? 'bg-line-strong text-ink-900' : i === 2 ? 'bg-tint-5 text-tint-5-ink' : 'bg-line text-text-muted',
                      ].join(' ')}>
                        {i + 1}
                      </span>
                      <span className="text-caption font-semibold text-text-subtle truncate">{p.name}</span>
                    </div>
                    <span className="text-right shrink-0 ml-2">
                      <span className="block text-caption font-bold text-text-subtle tabular-nums">{formatKHR(p.revenue as KHR)}</span>
                      <span className="block text-caption font-bold text-text-subtle tabular-nums">{formatUSD(p.revenue as KHR)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Debt summary */}
            {debtorCount > 0 && (
              <div className="px-5 py-3 border-b border-line">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-caption font-bold text-debt">👥 បំណុលអតិថិជន</p>
                    <p className="text-caption text-text-muted">{debtorCount} នាក់ជំពាក់</p>
                  </div>
                  <div className="text-right">
                    <p className="text-body font-extrabold text-debt tabular-nums">{formatKHR(totalDebt)}</p>
                    <p className="text-caption font-bold text-text-subtle tabular-nums">{formatUSD(totalDebt)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 text-center">
              <p className="text-caption text-text-muted">ថ្ងៃទី {today} · Rural POS System</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pb-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-13 py-3.5 rounded-2xl bg-ink-800 text-white font-bold text-body-sm flex items-center justify-center gap-2 active:bg-ink-900 transition-colors"
            >
              <Printer size={18} strokeWidth={2} />
              Print
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="h-13 py-3.5 rounded-2xl bg-ink-900 text-white font-bold text-body-sm flex items-center justify-center gap-2 active:bg-ink-800 transition-colors"
            >
              <Share2 size={18} strokeWidth={2} />
              Share
            </button>
          </div>

          {/* Screenshot tip */}
          <div className="flex items-start gap-2.5 bg-surface-2 rounded-xl px-3 py-2.5 border border-line">
            <CheckCircle2 size={15} className="text-text-subtle shrink-0 mt-0.5" />
            <p className="text-caption text-text-muted leading-relaxed">
              <span className="font-semibold text-text-subtle">Tip:</span> ថតរូបអេក្រង់ (Screenshot) Report Card ខាងលើ → ផ្ញើ WhatsApp / Telegram បានភ្លាម!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
