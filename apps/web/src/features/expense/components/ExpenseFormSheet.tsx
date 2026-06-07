'use client'

import { useState } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { expenseService, EXPENSE_CATEGORIES } from '@/services/expense.service'
import { formatKHR, toKHR, getExchangeRate } from '@/lib/money'
import { todayISODate } from '@/lib/date'
import type { Expense } from '@/types'
import type { TenantId, ExpenseId, KHR } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  expense?: Expense
  onClose: () => void
  onSaved: () => void
}

export function ExpenseFormSheet({ expense, onClose, onSaved }: Props) {
  const isEdit = !!expense
  const rate = getExchangeRate()

  const [amount,     setAmount]     = useState(expense ? String(expense.amount) : '')
  const [currency,   setCurrency]   = useState<'KHR' | 'USD'>('KHR')
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? EXPENSE_CATEGORIES[0].id)
  const [note,       setNote]       = useState(expense?.note ?? '')
  const [spentAt,    setSpentAt]    = useState(expense?.spentAt ?? todayISODate())
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const parsed   = Number(amount) || 0
  const amountKhr = (currency === 'USD' ? Math.round(parsed * rate) : Math.round(parsed)) as KHR
  const canSave  = amountKhr > 0 && !!categoryId && !saving

  const switchCurrency = (cur: 'KHR' | 'USD') => {
    if (cur === currency) return
    setCurrency(cur)
    setAmount('')
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (isEdit && expense) {
        await expenseService.update(expense.id as ExpenseId, {
          amount: amountKhr,
          categoryId,
          note: note.trim() || null,
          spentAt,
        })
      } else {
        await expenseService.create({
          tenantId: DEMO_TENANT,
          amount: amountKhr,
          categoryId,
          ...(note.trim() ? { note: note.trim() } : {}),
          spentAt,
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!expense || deleting) return
    setDeleting(true)
    try {
      await expenseService.softDelete(expense.id as ExpenseId)
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50"
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
          <span className="text-[16px] font-bold text-slate-900">
            {isEdit ? 'កែ​ការ​ចំណាយ' : 'បន្ថែម​ការ​ចំណាយ'}
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
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">

          {/* Amount + currency toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12px] font-semibold text-slate-500">ចំនួន​ទឹក​ប្រាក់ *</p>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                {(['KHR', 'USD'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => switchCurrency(cur)}
                    className={[
                      'min-h-0 min-w-0 h-7 px-3 text-[13px] font-bold tabular-nums transition-colors',
                      currency === cur ? 'bg-primary-600 text-white' : 'text-slate-500 active:bg-slate-50',
                    ].join(' ')}
                  >
                    {cur === 'KHR' ? '៛' : '$'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/15">
              <span className="pl-4 text-[16px] font-bold text-slate-400 shrink-0">
                {currency === 'USD' ? '$' : '៛'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="flex-1 h-12 px-3 text-right text-[22px] font-extrabold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none tabular-nums min-w-0"
              />
            </div>
            {currency === 'USD' && amountKhr > 0 && (
              <p className="text-right text-[12px] font-bold text-primary-600 tabular-nums mt-1">
                = {formatKHR(amountKhr)}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ប្រភេទ</p>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((c) => {
                const active = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={[
                      'h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors',
                      active
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-600 active:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="text-[18px] leading-none">{c.emoji}</span>
                    <span className="text-[11px] font-semibold">{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ថ្ងៃ​ចំណាយ</p>
            <input
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value || todayISODate())}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-[14px] text-slate-900 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Note */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">កំណត់​ចំណាំ (ស្រេចចិត្ត)</p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ឧ. ថ្លៃ​ដឹក​ទំនិញ"
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-[14px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Delete (edit only) */}
          {isEdit && (
            confirmDel ? (
              <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 space-y-2">
                <p className="text-[12px] font-semibold text-danger-700">លុប​ការ​ចំណាយ​នេះ?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 h-10 rounded-lg bg-danger-600 text-white font-bold text-[13px] active:bg-danger-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    បាទ/ចាស លុប
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(false)}
                    className="px-4 h-10 rounded-lg border border-slate-200 text-slate-600 text-[13px] active:bg-slate-50"
                  >
                    បោះបង់
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-danger-600 active:text-danger-700"
              >
                <Trash2 size={14} /> លុប​ការ​ចំណាយ​នេះ
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="w-full h-13 rounded-xl bg-primary-600 text-white font-bold text-[15px] py-3.5 active:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
            {isEdit ? 'រក្សាទុក' : 'បន្ថែម​ការ​ចំណាយ'}
          </button>
        </div>
      </div>
    </div>
  )
}
