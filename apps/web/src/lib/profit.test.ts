import { describe, expect, it } from 'vitest'
import { computeProfit } from './profit'
import type { Sale, SaleItem } from '@/types'

const sale = (id: string, total: number, isVoid = false) =>
  ({ id, totalAmount: total, isVoid } as unknown as Sale)
const item = (saleId: string, productId: string, qty: number, unitCost?: number) =>
  ({ saleId, productId, qty, ...(unitCost != null ? { unitCost } : {}) } as unknown as SaleItem)

describe('computeProfit', () => {
  it('revenue − cost of goods − expenses, ignoring void sales', () => {
    const p = computeProfit({
      sales: [sale('a', 10000), sale('b', 5000), sale('v', 99999, true)],
      items: [item('a', 'rice', 2, 3500), item('b', 'water', 5, 600), item('v', 'rice', 9, 3500)],
      currentCost: () => undefined,
      expenses: 1000,
    })
    expect(p).toEqual({ revenue: 15000, costOfGoods: 10000, gross: 5000, expenses: 1000, net: 4000, uncostedLines: 0 })
  })

  it('uses the cost recorded at sale time, not today’s cost', () => {
    const p = computeProfit({ sales: [sale('a', 5000)], items: [item('a', 'rice', 1, 3000)], currentCost: () => 4500, expenses: 0 })
    expect(p.costOfGoods).toBe(3000)
  })

  it('older sales without a recorded cost fall back to the product’s current cost', () => {
    const p = computeProfit({ sales: [sale('a', 5000)], items: [item('a', 'rice', 2)], currentCost: (id) => (id === 'rice' ? 2000 : undefined), expenses: 0 })
    expect(p.costOfGoods).toBe(4000)
    expect(p.gross).toBe(1000)
  })

  it('counts lines with no known cost so the screen can warn', () => {
    const p = computeProfit({ sales: [sale('a', 5000)], items: [item('a', 'x', 1, 0), item('a', 'y', 1)], currentCost: () => undefined, expenses: 0 })
    expect(p.uncostedLines).toBe(2)
    expect(p.gross).toBe(5000)
  })
})
