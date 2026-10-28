import type { Sale, SaleItem } from '@/types'
import type { KHR } from '@/types/branded'

/* Profit = what was sold − what those goods cost − expenses.
     revenue    Σ sale totals (after discounts), non-void sales only
     costOfGoods Σ qty × unit cost (cost at sale time, else today's product cost)
     gross      revenue − costOfGoods
     net        gross − expenses
   Debt sales count when sold (the goods left the shop), like the revenue. */

export interface ProfitSummary {
  revenue:     KHR
  costOfGoods: KHR
  gross:       KHR
  expenses:    KHR
  net:         KHR
  /** Sold lines with no known cost (cost 0) — profit is overstated by them */
  uncostedLines: number
}

export function computeProfit(input: {
  sales: readonly Sale[]
  items: readonly SaleItem[]
  /** Today's cost for a product, used when a sale line has no unitCost */
  currentCost: (productId: string) => number | undefined
  expenses: number
}): ProfitSummary {
  const live = new Set(input.sales.filter((s) => !s.isVoid).map((s) => s.id as string))
  const revenue = input.sales.reduce((sum, s) => (s.isVoid ? sum : sum + (s.totalAmount as number)), 0)

  let costOfGoods = 0
  let uncostedLines = 0
  for (const item of input.items) {
    if (!live.has(item.saleId as string)) continue
    const unit = (item.unitCost as number | undefined) ?? input.currentCost(item.productId as string) ?? 0
    if (unit <= 0) uncostedLines++
    costOfGoods += Math.round(unit * item.qty)
  }

  const gross = revenue - costOfGoods
  return {
    revenue:     revenue as KHR,
    costOfGoods: costOfGoods as KHR,
    gross:       gross as KHR,
    expenses:    input.expenses as KHR,
    net:         (gross - input.expenses) as KHR,
    uncostedLines,
  }
}
