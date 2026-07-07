import type { Sale, DebtTransaction } from '@/types'

export interface DebtItem {
  kind: 'opening' | 'sale'
  /** sale.id for sale invoices, charge txn id for manual/opening debts */
  id: string
  createdAt: string
  orig: number
  note: string | null
  chargeKind?: 'opening' | 'manual'
  sale: Sale | null
  currentRemaining: number
}

/**
 * Reconcile a customer's open debt items against their payments.
 *
 * Policy: each payment settles exactly one invoice in full and carries
 * `appliesToId` pointing at that item. Those targeted payments close their
 * linked item first. Any legacy/untargeted payments (older data with no
 * `appliesToId`) are then allocated oldest-first (FIFO) so historical balances
 * still reconcile. Σ(currentRemaining) === customer.debtBalance.
 *
 * Returns items newest-first for display.
 */
export function reconcileDebtItems(sales: Sale[], txns: DebtTransaction[]): DebtItem[] {
  const openings = txns
    .filter((t) => t.type === 'charge' && t.saleId == null)
    .map((t) => ({
      kind: 'opening' as const,
      id: String(t.id),
      createdAt: t.createdAt,
      orig: t.amount as number,
      note: t.note,
      chargeKind: t.chargeKind ?? 'opening',
      sale: null as Sale | null,
    }))
  const saleItems = sales.map((s) => ({
    kind: 'sale' as const,
    id: String(s.id),
    createdAt: s.createdAt,
    orig: (s.totalAmount - s.paidAmount) as number,
    note: null as string | null,
    sale: s as Sale | null,
  }))
  const all = [...openings, ...saleItems].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) // oldest first

  const remaining = new Map<string, number>(all.map((it) => [it.id, it.orig]))
  const payments = txns.filter((t) => t.type === 'payment' && !t.isVoid)

  // Phase 1 — targeted payments close their linked item.
  let pool = 0
  for (const p of payments) {
    const target = p.appliesToId
    if (target && remaining.has(target)) {
      remaining.set(target, Math.max(0, (remaining.get(target) as number) - (p.amount as number)))
    } else {
      pool += p.amount as number // legacy / untargeted → FIFO pool
    }
  }

  // Phase 2 — legacy pooled payments, oldest-first.
  for (const it of all) {
    if (pool <= 0) break
    const rem = remaining.get(it.id) as number
    const settled = Math.min(pool, rem)
    pool -= settled
    remaining.set(it.id, rem - settled)
  }

  return all
    .map((it) => ({ ...it, currentRemaining: remaining.get(it.id) as number }))
    .reverse() // newest first for display
}

/** Current amount still owed on a specific sale invoice (0 = fully settled). */
export function saleRemaining(saleId: string, sales: Sale[], txns: DebtTransaction[]): number {
  const item = reconcileDebtItems(sales, txns).find((it) => it.kind === 'sale' && it.id === saleId)
  return item ? item.currentRemaining : 0
}
