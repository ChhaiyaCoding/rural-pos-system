import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateExpenseId } from '@/lib/uuid'
import { nowISO, todayISODate } from '@/lib/date'
import type { Expense, Result } from '@/types'
import type { TenantId, ExpenseId, KHR } from '@/types/branded'

/** Fixed expense categories — common for a Cambodian shop */
export const EXPENSE_CATEGORIES = [
  { id: 'stock',     label: 'ទិញទំនិញចូល', emoji: '📦' },
  { id: 'utilities', label: 'ភ្លើង / ទឹក',  emoji: '💡' },
  { id: 'rent',      label: 'ជួលទីតាំង',    emoji: '🏠' },
  { id: 'salary',    label: 'ប្រាក់ឈ្នួល',  emoji: '👷' },
  { id: 'transport', label: 'ដឹកជញ្ជូន',    emoji: '🚚' },
  { id: 'other',     label: 'ផ្សេងៗ',       emoji: '🧾' },
] as const

export function expenseCategoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

export function expenseCategoryEmoji(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.emoji ?? '🧾'
}

export interface CreateExpenseInput {
  tenantId:   TenantId
  amount:     KHR
  categoryId: string
  note?:      string
  spentAt?:   string   // 'YYYY-MM-DD', defaults to today
}

export const expenseService = {
  async create(input: CreateExpenseInput): Promise<Result<Expense>> {
    const now = nowISO()
    const expense: Expense = {
      id:         generateExpenseId(),
      tenantId:   input.tenantId,
      amount:     input.amount,
      categoryId: input.categoryId,
      note:       input.note?.trim() ? input.note.trim() : null,
      spentAt:    input.spentAt || todayISODate(),
      createdAt:  now,
      updatedAt:  now,
      deletedAt:  null,
      syncedAt:   null,
    }

    await db.transaction('rw', [db.expenses, db.syncQueue], async () => {
      await db.expenses.add(expense)
      await enqueue({
        tenantId:  input.tenantId,
        tableName: 'expenses',
        recordId:  expense.id,
        operation: 'INSERT',
        payload:   JSON.stringify(expense),
      })
    })

    return { ok: true, data: expense }
  },

  async update(
    id: ExpenseId,
    patch: { amount?: KHR; categoryId?: string; note?: string | null; spentAt?: string }
  ): Promise<Result<Expense>> {
    const now = nowISO()
    await db.transaction('rw', [db.expenses, db.syncQueue], async () => {
      await db.expenses.update(id, { ...patch, updatedAt: now })
      const updated = await db.expenses.get(id)
      if (updated) {
        await enqueue({
          tenantId:  updated.tenantId,
          tableName: 'expenses',
          recordId:  id,
          operation: 'UPDATE',
          payload:   JSON.stringify(updated),
        })
      }
    })
    const result = await db.expenses.get(id)
    if (!result) return { ok: false, error: { code: 'EXPENSE_NOT_FOUND', expenseId: id } }
    return { ok: true, data: result }
  },

  /** Soft delete — never hard-delete a financial record */
  async softDelete(id: ExpenseId): Promise<void> {
    const now = nowISO()
    await db.transaction('rw', [db.expenses, db.syncQueue], async () => {
      await db.expenses.update(id, { deletedAt: now, updatedAt: now })
      const updated = await db.expenses.get(id)
      if (updated) {
        await enqueue({
          tenantId:  updated.tenantId,
          tableName: 'expenses',
          recordId:  id,
          operation: 'UPDATE',
          payload:   JSON.stringify(updated),
        })
      }
    })
  },

  async getByTenant(tenantId: TenantId): Promise<Expense[]> {
    return db.expenses
      .where('tenantId')
      .equals(tenantId)
      .filter((e) => !e.deletedAt)
      .toArray()
  },
}
