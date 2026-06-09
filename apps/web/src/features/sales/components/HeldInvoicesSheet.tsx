'use client'

import { X, Trash2, PlayCircle, PauseCircle } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { heldInvoiceService } from '@/services/heldInvoice.service'
import { formatKHR, formatUSD } from '@/lib/money'
import { formatDateTimeKm } from '@/lib/date'
import type { CartItem, HeldInvoice } from '@/types'
import type { TenantId, UUID } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  onClose:  () => void
  onResume: (items: CartItem[]) => void
}

export function HeldInvoicesSheet({ onClose, onResume }: Props) {
  const held = useLiveQuery(() => heldInvoiceService.list(DEMO_TENANT), []) ?? []

  const handleResume = async (h: HeldInvoice) => {
    onResume(h.items)
    await heldInvoiceService.remove(h.id as UUID)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl max-h-[88dvh] flex flex-col shadow-pop animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <span className="flex items-center gap-2 text-[16px] font-bold text-slate-900">
            <PauseCircle size={18} className="text-warning-600" strokeWidth={2.25} />
            វិក្កយបត្រ​ផ្អាក ({held.length})
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {held.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
                <PauseCircle size={30} strokeWidth={1.5} className="text-slate-300" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">គ្មាន​វិក្កយបត្រ​ផ្អាក</p>
              <p className="text-[12px] text-slate-400">ផ្អាក​កន្ត្រក​ពេល​មាន​អតិថិជន​ផ្សេង​ចូល​មុន</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {held.map((h) => (
                <div key={h.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-slate-900 truncate">
                        {h.label || `ផ្អាក · ${h.count} មុខ`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {h.count} មុខ · {formatDateTimeKm(h.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-extrabold text-slate-900 tabular-nums leading-tight">{formatKHR(h.total)}</p>
                      <p className="text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(h.total)}</p>
                    </div>
                  </div>
                  <div className="flex border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleResume(h)}
                      className="flex-1 h-11 flex items-center justify-center gap-1.5 text-[13px] font-bold text-success-700 active:bg-success-50 transition-colors"
                    >
                      <PlayCircle size={16} strokeWidth={2.25} /> បន្ត​លក់
                    </button>
                    <button
                      type="button"
                      onClick={() => db.heldInvoices.delete(h.id)}
                      aria-label="លុប"
                      className="w-14 h-11 flex items-center justify-center text-danger-500 border-l border-slate-100 active:bg-danger-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
