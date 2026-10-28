import { Package, Lightbulb, House, HardHat, Truck, ReceiptText, type LucideIcon } from 'lucide-react'

/** Display-only styling per expense category (ids from EXPENSE_CATEGORIES):
 *  chart color for bars/dots, a tinted tile, and a lucide icon. */
export interface ExpenseCategoryUi { bar: string; dot: string; tile: string; icon: LucideIcon }

const UI: Record<string, ExpenseCategoryUi> = {
  stock:     { bar: 'bg-chart-1', dot: 'bg-chart-1', tile: 'bg-tint-4 text-tint-4-ink',   icon: Package },
  utilities: { bar: 'bg-chart-2', dot: 'bg-chart-2', tile: 'bg-tint-1 text-tint-1-ink',   icon: Lightbulb },
  rent:      { bar: 'bg-chart-3', dot: 'bg-chart-3', tile: 'bg-tint-10 text-tint-10-ink', icon: House },
  salary:    { bar: 'bg-chart-4', dot: 'bg-chart-4', tile: 'bg-tint-8 text-tint-8-ink',   icon: HardHat },
  transport: { bar: 'bg-chart-5', dot: 'bg-chart-5', tile: 'bg-tint-6 text-tint-6-ink',   icon: Truck },
  other:     { bar: 'bg-chart-6', dot: 'bg-chart-6', tile: 'bg-tint-3 text-tint-3-ink',   icon: ReceiptText },
}

export function expenseCategoryUi(id: string): ExpenseCategoryUi {
  return UI[id] ?? UI.other!
}
