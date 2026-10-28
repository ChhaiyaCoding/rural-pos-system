import { describe, expect, it } from 'vitest'
import { reconcileDebtItems, saleRemaining } from './reconcile'
import type { CustomerId, DebtTransaction, Sale } from '@/types'

const sale = (id: string, createdAt: string, total: number, paid = 0): Sale => ({
  id: id as Sale['id'], tenantId: 't' as Sale['tenantId'], cashierId: 'c' as Sale['cashierId'],
  receiptNumber: id, totalAmount: total as Sale['totalAmount'], paidAmount: paid as Sale['paidAmount'],
  paymentType: 'debt', customerId: 'cust' as CustomerId, note: null, isVoid: false, createdAt, syncedAt: null,
})

const txn = (over: Partial<DebtTransaction>): DebtTransaction => ({
  id: Math.random().toString(36) as DebtTransaction['id'], tenantId: 't' as DebtTransaction['tenantId'],
  customerId: 'cust' as DebtTransaction['customerId'], saleId: null, amount: 0 as DebtTransaction['amount'],
  type: 'payment', method: null, note: null, isVoid: false, createdAt: '2026-01-10T00:00:00Z', syncedAt: null,
  ...over,
})

describe('reconcileDebtItems', () => {
  const sales = [
    sale('A', '2026-01-01T00:00:00Z', 2000),
    sale('B', '2026-01-02T00:00:00Z', 5000, 1000),   // partial: 4,000 owed
  ]

  it('targeted payment closes its own invoice only', () => {
    const items = reconcileDebtItems(sales, [txn({ amount: 4000 as never, appliesToId: 'B' })])
    expect(saleRemaining('A', sales, [txn({ amount: 4000 as never, appliesToId: 'B' })])).toBe(2000)
    expect(items.find((i) => i.id === 'B')?.currentRemaining).toBe(0)
  })

  it('untargeted (legacy) payments are applied oldest first, including opening balances', () => {
    const txns = [
      txn({ type: 'charge', amount: 1000 as never, createdAt: '2025-12-31T00:00:00Z' }), // opening debt
      txn({ amount: 2500 as never }),
    ]
    const items = reconcileDebtItems(sales, txns)
    const rem = Object.fromEntries(items.map((i) => [i.kind === 'sale' ? i.id : 'opening', i.currentRemaining]))
    expect(rem).toEqual({ opening: 0, A: 500, B: 4000 })
  })

  it('voided payments are ignored and the total equals what is still owed', () => {
    const txns = [txn({ amount: 2000 as never, appliesToId: 'A', isVoid: true }), txn({ amount: 1000 as never })]
    const items = reconcileDebtItems(sales, txns)
    expect(items.reduce((s, i) => s + i.currentRemaining, 0)).toBe(2000 + 4000 - 1000)
    expect(items.map((i) => i.id)).toEqual(['B', 'A'])   // newest first
  })
})
