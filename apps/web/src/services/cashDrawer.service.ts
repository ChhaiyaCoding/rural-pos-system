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
}
