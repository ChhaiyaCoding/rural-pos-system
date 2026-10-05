'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cx } from '@/components/ui/cx'
import { expenseCategoryUi } from '../categoryUi'
import { expenseService, EXPENSE_CATEGORIES } from '@/services/expense.service'
import { formatKHR, getExchangeRate } from '@/lib/money'
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
    <Sheet
      open
      onClose={onClose}
      title={isEdit ? 'កែ​ការ​ចំណាយ' : 'បន្ថែម​ការ​ចំណាយ'}
      footer={
        <Button
          variant="primary"
          size="xl"
          fullWidth
          disabled={!canSave}
          onClick={handleSave}
          icon={saving ? <Loader2 size={20} className="animate-spin" /> : undefined}
        >
          {isEdit ? 'រក្សាទុក' : 'បន្ថែម​ការ​ចំណាយ'}
        </Button>
      }
    >
      <div className="space-y-4 pt-1">

        {/* Amount + currency toggle */}
        <div className="space-y-2">
          <SegmentedControl
            ariaLabel="រូបិយប័ណ្ណ"
            value={currency}
            onChange={switchCurrency}
            items={[{ value: 'KHR', label: '៛ រៀល' }, { value: 'USD', label: '$ ដុល្លារ' }]}
          />
          <div className="flex min-h-[64px] items-center gap-2 rounded-[18px] bg-bg px-4 focus-within:ring-2 focus-within:ring-ink-900/20">
            <div className="flex min-w-0 flex-1 flex-col py-1.5">
              <label htmlFor="expense-amount" className="text-caption font-semibold text-text-subtle">ចំនួន​ទឹក​ប្រាក់ *</label>
              <input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full min-w-0 bg-transparent text-title font-bold tabular-nums text-text outline-none placeholder:text-text-muted"
              />
            </div>
            <span className="text-title-sm font-bold text-text-subtle">{currency === 'USD' ? '$' : '៛'}</span>
          </div>
          {currency === 'USD' && amountKhr > 0 && (
            <p className="text-right text-meta font-semibold tabular-nums text-text-muted">
              = {formatKHR(amountKhr)}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <p className="mb-2 text-meta font-semibold text-text-subtle">ប្រភេទ</p>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_CATEGORIES.map((c) => {
              const active = categoryId === c.id
              const Icon = expenseCategoryUi(c.id).icon
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={active}
                  className={cx(
                    'flex h-[72px] flex-col items-center justify-center gap-1 rounded-md px-1 transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                    active ? 'bg-ink-900 text-white' : 'bg-bg text-text-subtle active:bg-line',
                  )}
                >
                  <Icon size={22} strokeWidth={2} className={active ? 'text-accent' : undefined} aria-hidden="true" />
                  <span className="text-caption font-semibold leading-tight">{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-bg px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
          <label htmlFor="expense-date" className="text-caption font-semibold text-text-subtle">ថ្ងៃ​ចំណាយ</label>
          <input
            id="expense-date"
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value || todayISODate())}
            className="w-full bg-transparent text-body font-semibold text-text outline-none"
          />
        </div>

        {/* Note */}
        <div className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-bg px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
          <label htmlFor="expense-note" className="text-caption font-semibold text-text-subtle">កំណត់​ចំណាំ (ស្រេចចិត្ត)</label>
          <input
            id="expense-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ឧ. ថ្លៃ​ដឹក​ទំនិញ"
            className="w-full bg-transparent text-body text-text outline-none placeholder:text-text-muted"
          />
        </div>

        {/* Delete (edit only) */}
        {isEdit && (
          confirmDel ? (
            <div className="space-y-2.5 rounded-md bg-danger-bg p-3">
              <p className="text-body-sm font-semibold text-danger">លុប​ការ​ចំណាយ​នេះ?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-danger text-body font-bold text-white active:brightness-95 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                  បាទ/ចាស លុប
                </button>
                <Button variant="secondary" onClick={() => setConfirmDel(false)}>
                  បោះបង់
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="dangerSoft" fullWidth icon={<Trash2 size={16} />} onClick={() => setConfirmDel(true)}>
              លុប​ការ​ចំណាយ​នេះ
            </Button>
          )
        )}
      </div>
    </Sheet>
  )
}
