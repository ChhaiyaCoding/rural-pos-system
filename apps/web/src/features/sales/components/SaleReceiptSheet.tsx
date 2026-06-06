'use client'

import { useState, useRef } from 'react'
import { X, Printer, Share2, RotateCcw, CheckCircle2, Check, ImageDown } from 'lucide-react'
import { formatKHR, formatUSD, toKHR, addKHR } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import { useStoreProfile } from '@/store/storeProfile.store'
import type { KHR } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  nameKm: string
  qty: number
  unitPrice: KHR
  subtotal: KHR
}

export interface ReceiptData {
  receiptNumber: string       // e.g. "20260531-CEDB"
  cashierName?: string        // e.g. "សុខា"
  items: ReceiptItem[]
  discount?: KHR              // ០ if no discount
  totalAmount: KHR            // final amount after discount
  paymentType: 'cash' | 'debt'
  cashReceived?: KHR | null   // amount customer handed over (cash) / paid now (partial)
  changeGiven?: KHR | null    // change returned (cash only)
  debtRemaining?: KHR | null  // amount still owed (debt / partial)
  customerName?: string | null // who owes (debt only)
  createdAt: string
}

interface Props {
  data: ReceiptData
  onClose: () => void
}

// ─── Helper: small label-value row ────────────────────────────────────────────

function MetaRow({
  label,
  value,
  bold = false,
  valueClass = '',
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[12px] text-slate-400 shrink-0">{label}</span>
      <span
        className={[
          'text-[12px] text-right tabular-nums',
          bold ? 'font-bold text-slate-900' : 'font-medium text-slate-700',
          valueClass,
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Build plain-text receipt for sharing ─────────────────────────────────────

function buildShareText(data: ReceiptData, storeName = 'ហាងលក់ទំនិញ', storePhone = '', footer = '🙏 អរគុណដែលបានមកទិញ!', headerNote = ''): string {
  const isCash = data.paymentType === 'cash'
  const discount = data.discount ?? toKHR(0)
  const itemsSubtotal = data.items.reduce(
    (s, i) => addKHR(s, i.subtotal),
    toKHR(0)
  )

  const line = (l: string, r: string, width = 32) => {
    const gap = width - l.length - r.length
    return l + ' '.repeat(Math.max(1, gap)) + r
  }

  const rows = [
    '╔══════════════════════════════╗',
    `║  ${storeName.padEnd(28)}║`,
    '╚══════════════════════════════╝',
    headerNote ? headerNote : '',
    storePhone ? `📞 ${storePhone}` : '',
    '',
    `វិក្កយបត្រ #${data.receiptNumber}`,
    formatDateTimeKm(data.createdAt),
    data.cashierName ? `អ្នកគិតលុយ: ${data.cashierName}` : '',
    '──────────────────────────────',
    ...data.items.map((i) =>
      `${i.nameKm}\n  ${formatKHR(i.unitPrice)} × ${i.qty}   ${formatKHR(i.subtotal)}`
    ),
    '──────────────────────────────',
    line('សរុបរង', formatKHR(itemsSubtotal)),
    discount > 0 ? line('បញ្ចុះតម្លៃ', `-${formatKHR(discount)}`) : '',
    '══════════════════════════════',
    line('សរុបចុងក្រោយ', formatKHR(data.totalAmount)),
    line('', formatUSD(data.totalAmount)),
    '──────────────────────────────',
    isCash ? `ប្រភេទ: សាច់ប្រាក់` : 'ប្រភេទ: ជំពាក់',
    isCash && data.cashReceived
      ? line('ប្រាក់ទទួល', formatKHR(data.cashReceived))
      : '',
    isCash && data.changeGiven && data.changeGiven > 0
      ? line('ប្រាក់អាប់', formatKHR(data.changeGiven))
      : '',
    !isCash && data.cashReceived && data.cashReceived > 0
      ? line('បានទូទាត់', formatKHR(data.cashReceived))
      : '',
    !isCash && data.debtRemaining && data.debtRemaining > 0
      ? line('នៅខ្វះ (ជំពាក់)', formatKHR(data.debtRemaining))
      : '',
    !isCash && data.customerName ? `អ្នកជំពាក់: ${data.customerName}` : '',
    '══════════════════════════════',
    `     ${footer}`,
  ]

  return rows.filter(Boolean).join('\n')
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SaleReceiptSheet({ data, onClose }: Props) {
  const [copied,        setCopied]        = useState(false)
  const [capturing,     setCapturing]     = useState(false)
  const [imageDone,     setImageDone]     = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const {
    storeName, storeAddress, storePhone, storeLogo,
    cashierName: defaultCashier, receiptFooter,
    receiptHeaderNote, receiptShowLogo, receiptShowCashier,
    receiptShowPhone, receiptShowAddress,
  } = useStoreProfile()

  const isCash        = data.paymentType === 'cash'
  const discount      = data.discount ?? toKHR(0)
  const itemsSubtotal = data.items.reduce((s, i) => addKHR(s, i.subtotal), toKHR(0))
  const displayName    = storeName     || 'ហាងលក់ទំនិញ'
  const displayAddr    = storeAddress  || 'ភ្នំពេញ · Cambodia'
  const displayPhone   = storePhone    || ''
  const displayFooter  = receiptFooter || '🙏 អរគុណដែលបានមកទិញ!'
  const displayInitial = displayName.charAt(0) || 'ហ'
  const cashier        = data.cashierName ?? defaultCashier

  /* ── Share text (copy fallback) ─────────────────────────────── */
  const handleShare = async () => {
    const text = buildShareText(data, displayName, receiptShowPhone ? displayPhone : '', displayFooter, receiptHeaderNote.trim())
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: `វិក្កយបត្រ #${data.receiptNumber}`, text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  /* ── Capture receipt as image → share / download ────────────── */
  const handleShareImage = async () => {
    if (!receiptRef.current || capturing) return
    setCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,            // retina quality
        useCORS: true,
        logging: false,
      })

      const fileName = `receipt-${data.receiptNumber}.png`

      // Try Web Share API with file (mobile: Telegram, FB Messenger, etc.)
      if (navigator.canShare) {
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
        )
        const file = new File([blob], fileName, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `វិក្កយបត្រ #${data.receiptNumber}` })
          setImageDone(true)
          setTimeout(() => setImageDone(false), 2500)
          return
        }
      }

      // Fallback: download PNG
      const link = document.createElement('a')
      link.download = fileName
      link.href = canvas.toDataURL('image/png')
      link.click()
      setImageDone(true)
      setTimeout(() => setImageDone(false), 2500)
    } catch {
      // silent — user dismissed share sheet or unsupported
    } finally {
      setCapturing(false)
    }
  }

  /* ── Print ───────────────────────────────────────────────────── */
  const handlePrint = () => window.print()

  /* ──────────────────────────────────────────────────────────── */

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60"
      onClick={onClose}
    >
      <div
        className="
          w-full md:max-w-[420px]
          bg-surface rounded-t-2xl md:rounded-2xl
          max-h-[96dvh] flex flex-col
          shadow-pop animate-sheet-up
        "
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="វិក្កយបត្រ"
      >

        {/* ══ Top bar ════════════════════════════════════════════ */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 bg-white rounded-t-2xl md:rounded-t-2xl border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-success-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-success-600" strokeWidth={2.5} />
            </div>
            <span className="text-[16px] font-bold text-slate-900">វិក្កយបត្រ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="min-h-0 min-w-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200"
          >
            <X size={17} />
          </button>
        </div>

        {/* ══ Receipt paper (scrollable) ════════════════════════ */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">

          {/* Paper card — ref for image capture */}
          <div ref={receiptRef} className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

            {/* ── Perforation top ─────────────────────────────── */}
            <div className="flex items-center gap-[3px] px-1 py-2 border-b border-dashed border-slate-300">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="flex-1 h-px bg-slate-200" />
              ))}
            </div>

            {/* ── Store header (centered) ──────────────────────── */}
            <div className="pt-5 pb-4 px-6 text-center">
              {receiptShowLogo && (
                storeLogo ? (
                  <img
                    src={storeLogo}
                    alt="Store logo"
                    className="w-14 h-14 rounded-2xl object-cover mx-auto mb-2.5 border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-primary-600 text-white text-[17px] font-bold flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                    {displayInitial}
                  </div>
                )
              )}
              <h2 className="text-[16px] font-extrabold text-slate-900 tracking-tight">
                {displayName}
              </h2>
              {receiptHeaderNote.trim() && (
                <p className="text-[11px] font-medium text-slate-500 mt-1 whitespace-pre-line leading-snug">
                  {receiptHeaderNote}
                </p>
              )}
              {receiptShowAddress && (
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  {displayAddr}
                </p>
              )}
              {receiptShowPhone && displayPhone && (
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  📞 {displayPhone}
                </p>
              )}
            </div>

            {/* ── Dashed divider ───────────────────────────────── */}
            <Divider />

            {/* ── Receipt meta info ───────────────────────────── */}
            <div className="px-5 py-3 space-y-1.5">
              <MetaRow label="វិក្កយបត្រ" value={`#${data.receiptNumber}`} bold />
              <MetaRow label="ថ្ងៃ/ម៉ោង"  value={formatDateTimeKm(data.createdAt)} />
              {receiptShowCashier && cashier && (
                <MetaRow label="អ្នកគិតលុយ" value={cashier} />
              )}
            </div>

            {/* ── Dashed divider ───────────────────────────────── */}
            <Divider />

            {/* ── Items header ────────────────────────────────── */}
            <div className="px-5 pt-3 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ទំនិញ
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                សរុប
              </span>
            </div>

            {/* ── Items list ──────────────────────────────────── */}
            <div className="px-5 pb-4 space-y-3.5">
              {data.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 leading-snug">
                      {item.nameKm}
                    </p>
                    <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                      {formatKHR(item.unitPrice)} × {item.qty}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold text-slate-900 tabular-nums shrink-0 pt-0.5">
                    {formatKHR(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Dashed divider ───────────────────────────────── */}
            <Divider />

            {/* ── Subtotal + discount ─────────────────────────── */}
            <div className="px-5 py-3 space-y-1.5">
              <MetaRow label="សរុបរង" value={formatKHR(itemsSubtotal)} />
              {discount > 0 && (
                <MetaRow
                  label="បញ្ចុះតម្លៃ"
                  value={`−${formatKHR(discount)}`}
                  valueClass="text-danger-600"
                />
              )}
            </div>

            {/* ── Double rule before total ─────────────────────── */}
            <div className="mx-5 h-px bg-slate-800" />
            <div className="mx-5 mt-[3px] h-px bg-slate-800" />

            {/* ── Grand total ─────────────────────────────────── */}
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-[14px] font-extrabold text-slate-900">
                សរុបចុងក្រោយ
              </span>
              <div className="text-right">
                <span className="block text-[22px] font-extrabold text-slate-900 tabular-nums tracking-tight leading-tight">
                  {formatKHR(data.totalAmount)}
                </span>
                <span className="block text-[14px] font-bold text-primary-600 tabular-nums">
                  {formatUSD(data.totalAmount)}
                </span>
              </div>
            </div>

            {/* ── Dashed divider ───────────────────────────────── */}
            <Divider />

            {/* ── Payment section ─────────────────────────────── */}
            <div className="px-5 py-3 space-y-2.5">

              {/* Payment type badge */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-400">ប្រភេទទូទាត់</span>
                <span
                  className={[
                    'text-[11px] font-bold px-3 py-1 rounded-full',
                    isCash
                      ? 'bg-success-100 text-success-700'
                      : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {isCash ? 'សាច់ប្រាក់' : 'ជំពាក់'}
                </span>
              </div>

              {/* Cash received */}
              {isCash && data.cashReceived != null && (
                <MetaRow
                  label="ប្រាក់ទទួលពីអតិថិជន"
                  value={formatKHR(data.cashReceived)}
                />
              )}

              {/* Change due */}
              {isCash && data.changeGiven != null && data.changeGiven > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-success-50 border border-success-100 px-3.5 py-2.5">
                  <span className="text-[12px] font-semibold text-success-700">
                    ប្រាក់អាប់
                  </span>
                  <span className="text-[17px] font-extrabold text-success-700 tabular-nums">
                    {formatKHR(data.changeGiven)}
                  </span>
                </div>
              )}

              {/* Partial: amount paid now */}
              {!isCash && data.cashReceived != null && data.cashReceived > 0 && (
                <MetaRow
                  label="បានទូទាត់"
                  value={formatKHR(data.cashReceived)}
                />
              )}

              {/* Debt still owed */}
              {!isCash && data.debtRemaining != null && data.debtRemaining > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-danger-50 border border-danger-100 px-3.5 py-2.5">
                  <span className="text-[12px] font-semibold text-danger-700">
                    នៅខ្វះ (ជំពាក់)
                  </span>
                  <div className="text-right">
                    <span className="block text-[17px] font-extrabold text-danger-700 tabular-nums leading-tight">
                      {formatKHR(data.debtRemaining)}
                    </span>
                    <span className="block text-[11px] font-bold text-primary-600 tabular-nums">
                      {formatUSD(data.debtRemaining)}
                    </span>
                  </div>
                </div>
              )}

              {/* Debt customer */}
              {!isCash && data.customerName && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
                  <span className="text-[12px] text-slate-500">អ្នកជំពាក់</span>
                  <span className="text-[13px] font-semibold text-slate-800">
                    {data.customerName}
                  </span>
                </div>
              )}
            </div>

            {/* ── Dashed divider ───────────────────────────────── */}
            <Divider />

            {/* ── Thank you footer ────────────────────────────── */}
            <div className="px-5 py-4 text-center">
              <p className="text-[12px] font-semibold text-slate-500 whitespace-pre-line leading-relaxed">
                {displayFooter}
              </p>
            </div>

            {/* ── Perforation bottom ───────────────────────────── */}
            <div className="flex items-center gap-[3px] px-1 py-2 border-t border-dashed border-slate-300">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="flex-1 h-px bg-slate-200" />
              ))}
            </div>

          </div>{/* /paper card */}
        </div>{/* /scroll area */}

        {/* ══ Action footer ══════════════════════════════════════ */}
        <div className="shrink-0 bg-white border-t border-slate-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">

          <div className="grid grid-cols-3 gap-2">

            {/* Print */}
            <ActionButton
              icon={<Printer size={18} strokeWidth={2} />}
              label="បោះពុម្ព"
              onClick={handlePrint}
            />

            {/* Share image → Telegram / FB / download */}
            <ActionButton
              icon={
                capturing ? (
                  <span className="w-[18px] h-[18px] border-2 border-primary-400 border-t-transparent rounded-full animate-spin inline-block" />
                ) : imageDone ? (
                  <Check size={18} strokeWidth={2.5} className="text-success-600" />
                ) : (
                  <ImageDown size={18} strokeWidth={2} />
                )
              }
              label={capturing ? 'កំពុងរៀបចំ…' : imageDone ? 'រួចហើយ!' : 'រូបភាព'}
              onClick={handleShareImage}
              active={imageDone}
              loading={capturing}
            />

            {/* Share text */}
            <ActionButton
              icon={copied
                ? <Check size={18} strokeWidth={2.5} className="text-success-600" />
                : <Share2 size={18} strokeWidth={2} />
              }
              label={copied ? 'បានចម្លង!' : 'អត្ថបទ'}
              onClick={handleShare}
              active={copied}
            />

          </div>

          <p className="text-center text-[10px] text-slate-300 mt-2">
            «រូបភាព» → share ទៅ Telegram · Facebook ផ្ទាល់
          </p>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <div className="mx-5 border-b border-dashed border-slate-200" />
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
  active = false,
  loading = false,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  active?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'flex flex-col items-center justify-center gap-1.5 h-[60px] rounded-xl border transition-colors',
        'min-h-0 min-w-0',
        disabled
          ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
          : loading
            ? 'border-primary-200 bg-primary-50 text-primary-500'
            : danger
              ? 'border-danger-200 bg-danger-50 text-danger-400 active:bg-danger-100'
              : active
                ? 'border-success-200 bg-success-50 text-success-600'
                : 'border-slate-200 bg-slate-50 text-slate-600 active:bg-slate-100',
      ].join(' ')}
    >
      {icon}
      <span className="text-[11px] font-semibold leading-none">{label}</span>
    </button>
  )
}
