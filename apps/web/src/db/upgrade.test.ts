import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

/* A phone already running the app has a v6 database. Opening it with the
   current schema must keep every row (v7 only adds indexes). */
describe('Dexie upgrade v6 → current', () => {
  it('keeps existing sales, products and debts', async () => {
    const old = new Dexie('pos-db')
    old.version(1).stores({
      products: 'id, tenantId, barcode, deletedAt', customers: 'id, tenantId, deletedAt',
      sales: 'id, tenantId, createdAt, isVoid', saleItems: 'id, saleId, tenantId, productId',
      debtTransactions: 'id, tenantId, customerId, createdAt, isVoid',
      syncQueue: 'id, tenantId, createdAt, syncedAt, retryCount',
    })
    old.version(2).stores({ products: 'id, tenantId, barcode, categoryId, deletedAt' })
    old.version(3).stores({ cashDrawers: 'id, tenantId, openedAt, closedAt' })
    old.version(4).stores({ stockMovements: 'id, tenantId, productId, createdAt, type' })
    old.version(5).stores({ expenses: 'id, tenantId, spentAt, categoryId, deletedAt' })
    old.version(6).stores({ heldInvoices: 'id, tenantId, createdAt' })
    await old.open()
    await old.table('sales').bulkAdd([
      { id: 's1', tenantId: 'tenant-demo', customerId: 'c1', createdAt: '2026-10-01T00:00:00.000Z', isVoid: false, totalAmount: 5000 },
      { id: 's2', tenantId: 'tenant-demo', customerId: null, createdAt: '2026-10-02T00:00:00.000Z', isVoid: false, totalAmount: 1000 },
    ])
    await old.table('products').add({ id: 'p1', tenantId: 'tenant-demo', nameKm: 'អង្ករ', stockQty: 7 })
    await old.table('debtTransactions').add({ id: 'd1', tenantId: 'tenant-demo', customerId: 'c1', createdAt: '2026-10-01T00:00:00.000Z', isVoid: false, amount: 5000, type: 'charge' })
    old.close()

    const { db } = await import('@/db')
    const { salesBetween, lastPurchaseAt } = await import('./queries')
    expect(db.verno).toBeGreaterThanOrEqual(7)
    expect(await db.sales.count()).toBe(2)
    expect((await db.products.get('p1' as never))?.stockQty).toBe(7)
    expect(await db.debtTransactions.count()).toBe(1)
    // the new indexes work on the old rows
    expect(await salesBetween('tenant-demo' as never, '2026-10-02T00:00:00.000Z').count()).toBe(1)
    expect(await lastPurchaseAt('tenant-demo' as never, 'c1' as never)).toBe('2026-10-01T00:00:00.000Z')
  })
})
