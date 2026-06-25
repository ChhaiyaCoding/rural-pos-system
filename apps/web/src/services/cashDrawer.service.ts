import { db } from '@/db'
import { generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { addKHR, toKHR } from '@/lib/money'
import type { CashDrawer } from '@/types'
import type { TenantId, UserId, KHR } from '@/types/branded'

export interface OpenDrawerInput {
  tenantId:       TenantId
  cashierId:      UserId
  cashierName:    string
  openingBalance: KHR
}

export interface CloseDrawerInput {
  drawerId:       string
  closingBalance: KHR
  note?:          string
}

/** Daily summary for a store-day, computed on-the-fly from sales/expenses. */
export interface StoreDaySummary {
  totalSales:    KHR   // all non-void sales in window
  cashSales:     KHR   // paymentType 'cash'
  debtSales:     KHR   // paymentType 'debt' | 'partial'
  abaSales:      KHR   // debt payments received via method 'aba' in window
  totalExpenses: KHR
  netProfit:     KHR   // totalSales − totalExpenses
  openingCash:   KHR
  openedAt:      string
  closedAt:      string | null
}

export const cashDrawerService = {

  /* ── Open new shift ──────────────────────────────── */
  async open(input: OpenDrawerInput): Promise<CashDrawer> {
    const drawer: CashDrawer = {
      id:              generateId(),
      tenantId:        input.tenantId,
      cashierId:       input.cashierId,
      cashierName:     input.cashierName,
      openingBalance:  input.openingBalance,
      closingBalance:  null,
      cashSalesTotal:  null,
      expectedBalance: null,
      difference:      null,
      openedAt:        nowISO(),
      closedAt:        null,
      note:            null,
    }
    await db.cashDrawers.add(drawer)
    return drawer
  },

  /* ── Close shift ─────────────────────────────────── */
  async close(input: CloseDrawerInput): Promise<CashDrawer | null> {
    const drawer = await db.cashDrawers.get(input.drawerId)
    if (!drawer || drawer.closedAt) return null

    // Calculate cash sales during this shift
    const cashSales = await db.sales
      .where('tenantId').equals(drawer.tenantId)
      .filter(s =>
        !s.isVoid &&
        s.paymentType === 'cash' &&
        s.createdAt >= drawer.openedAt
      )
      .toArray()

    const cashSalesTotal = cashSales.reduce(
      (sum, s) => (sum + s.totalAmount) as KHR, 0 as KHR
    )
    const expectedBalance = addKHR(drawer.openingBalance, cashSalesTotal)
    const difference      = (input.closingBalance - expectedBalance) as KHR

    const updated: Partial<CashDrawer> = {
      closingBalance:  input.closingBalance,
      cashSalesTotal,
      expectedBalance,
      difference,
      closedAt: nowISO(),
      note:     input.note ?? null,
    }

    await db.cashDrawers.update(input.drawerId, updated)
    return (await db.cashDrawers.get(input.drawerId)) ?? null
  },

  /* ── Get current open drawer ─────────────────────── */
  async getCurrent(tenantId: TenantId): Promise<CashDrawer | null> {
    const drawers = await db.cashDrawers
      .where('tenantId').equals(tenantId)
      .filter(d => !d.closedAt)
      .toArray()
    if (!drawers.length) return null
    // Return most recent open drawer
    return drawers.sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0] ?? null
  },

  /* ── Get shift history ───────────────────────────── */
  async getHistory(tenantId: TenantId, limit = 30): Promise<CashDrawer[]> {
    const all = await db.cashDrawers
      .where('tenantId').equals(tenantId)
      .toArray()
    return all
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
      .slice(0, limit)
  },

  /* ── Get cash sales total for current open shift ─── */
  async getLiveCashSales(drawer: CashDrawer): Promise<KHR> {
    const cashSales = await db.sales
      .where('tenantId').equals(drawer.tenantId)
      .filter(s =>
        !s.isVoid &&
        s.paymentType === 'cash' &&
        s.createdAt >= drawer.openedAt
      )
      .toArray()
    return cashSales.reduce((sum, s) => (sum + s.totalAmount) as KHR, 0 as KHR)
  },

  /* ── Daily summary for a store-day ───────────────── */
  // Computed on-the-fly over the window [openedAt, closedAt||now].
  // Read-only — touches no Inventory / Customer / Debt logic.
  async getStoreDaySummary(drawer: CashDrawer): Promise<StoreDaySummary> {
    const until = drawer.closedAt ?? nowISO()

    const sales = await db.sales
      .where('tenantId').equals(drawer.tenantId)
      .filter(s =>
        !s.isVoid &&
        s.createdAt >= drawer.openedAt &&
        s.createdAt <= until
      )
      .toArray()

    let cashSales = 0
    let debtSales = 0
    for (const s of sales) {
      if (s.paymentType === 'cash') {
        cashSales += s.totalAmount
      } else {
        // 'debt' | 'partial' — only the UNPAID remainder is credit/debt.
        // The paid portion (full for cash, partial for 'partial', 0 for 'debt')
        // is cash actually received at the point of sale.
        cashSales += s.paidAmount
        debtSales += s.totalAmount - s.paidAmount
      }
    }
    const totalSales = cashSales + debtSales

    // ABA money is only tracked on the debt ledger (payments via method 'aba').
    const debtTxns = await db.debtTransactions
      .where('tenantId').equals(drawer.tenantId)
      .filter(t =>
        !t.isVoid &&
        t.type === 'payment' &&
        t.method === 'aba' &&
        t.createdAt >= drawer.openedAt &&
        t.createdAt <= until
      )
      .toArray()
    const abaSales = debtTxns.reduce((sum, t) => sum + t.amount, 0)

    const expenses = await db.expenses
      .where('tenantId').equals(drawer.tenantId)
      .filter(e =>
        !e.deletedAt &&
        e.createdAt >= drawer.openedAt &&
        e.createdAt <= until
      )
      .toArray()
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    return {
      totalSales:    totalSales    as KHR,
      cashSales:     cashSales     as KHR,
      debtSales:     debtSales     as KHR,
      abaSales:      abaSales      as KHR,
      totalExpenses: totalExpenses as KHR,
      netProfit:     (totalSales - totalExpenses) as KHR,
      openingCash:   drawer.openingBalance,
      openedAt:      drawer.openedAt,
      closedAt:      drawer.closedAt,
    }
  },
}
