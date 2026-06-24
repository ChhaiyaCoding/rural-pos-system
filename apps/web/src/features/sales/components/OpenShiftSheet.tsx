'use client'

import { useState } from 'react'
import { X, Banknote } from 'lucide-react'
import { cashDrawerService } from '@/services/cashDrawer.service'
import { formatKHR, toKHR } from '@/lib/money'
import type { CashDrawer } from '@/types'
import type { TenantId, UserId, KHR } from '@/types/branded'

const DEMO_TENANT  = 'tenant-demo' as TenantId
const DEMO_CASHIER = 'cashier-demo' as UserId

const QUICK_AMTS = [0, 10_000, 20_000, 50_000, 100_000, 200_000]

interface Props {
  cashierName: string
  onOpened:    (drawer: CashDrawer) => void
  onClose:     () => void
}

export function OpenShiftSheet({ cashierName, onOpened, onClose }: Props) {
  const [amount,  setAmount]  = useState('')
  const [saving,  setSaving]  = useState(false)

  const parsedAmt = Math.max(0, Number(amount) || 0)

  const handleOpen = async () => {
    if (saving) return
    setSaving(true)
    try {
      const drawer = await cashDrawerService.open({
        tenantId:       DEMO_TENANT,
        cashierId:      DEMO_CASHIER,
        cashierName,
        openingBalance: toKHR(parsedAmt) as KHR,
      })
      onOpened(drawer)
    } finally {
      setSaving(false)
    }
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('km-KH', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/70"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-success-600 px-5 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Banknote size={20} strokeWidth={2} />
              <span className="text-[16px] font-bold">បើកហាង</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <X size={15} />
            </button>
          </div>
          <p className="text-[13px] opacity-80">{cashierName} · {dateStr} · {timeStr}</p>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Opening cash input */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-2">ប្រាក់ក្នុងហ្គូពេលចាប់ផ្ដើម (រៀល)</p>
            <div className="flex items-center border-2 border-success-300 rounded-2xl bg-success-50 overflow-hidden focus-within:border-success-500 transition-colors">
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpen()}
                placeholder="0"
                autoFocus
                className="flex-1 h-14 px-5 text-[24px] font-extrabold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none tabular-nums"
              />
              <span className="pr-5 text-[16px] font-bold text-success-600">៛</span>
            </div>
            {parsedAmt > 0 && (
              <p className="text-[11px] text-success-600 font-semibold mt-1.5">
                = {formatKHR(toKHR(parsedAmt) as KHR)}
              </p>
            )}
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-[11px] text-slate-400 mb-2">ចំនួនរហ័ស</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMTS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className={[
                    'h-9 px-3 rounded-xl border text-[12px] font-bold transition-colors',
                    amount === String(amt)
                      ? 'bg-success-600 border-success-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 active:bg-slate-50',
                  ].join(' ')}
                >
                  {amt === 0 ? '0 ៛' : formatKHR(toKHR(amt) as KHR)}
                </button>
              ))}
            </div>
          </div>

          {/* Info note */}
          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 leading-relaxed">
            💡 ប្រាក់ដែលមានក្នុងហ្គូ <span className="font-semibold text-slate-600">មុន</span>ពេលចាប់ផ្ដើមលក់ថ្ងៃនេះ
          </p>

          {/* Confirm */}
          <button
            type="button"
            disabled={saving}
            onClick={handleOpen}
            className="w-full h-14 rounded-2xl bg-success-600 text-white font-bold text-[16px] disabled:opacity-50 active:bg-success-700 transition-colors flex items-center justify-center gap-2"
          >
            <Banknote size={20} />
            {saving ? 'កំពុងបើក…' : 'បើកហាង'}
          </button>
        </div>
      </div>
    </div>
  )
}
