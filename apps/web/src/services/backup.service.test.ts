import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { backupService } from './backup.service'
import { saleService } from './sale.service'
import { CASHIER, TENANT, addCustomer, addProduct, khr, line, resetDb } from '@/test/fixtures'

beforeEach(resetDb)

async function snapshot() {
  const sort = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id))
  return {
    products: sort(await db.products.toArray()),
    customers: sort(await db.customers.toArray()),
    sales: sort(await db.sales.toArray()),
    saleItems: sort(await db.saleItems.toArray()),
    debtTransactions: sort(await db.debtTransactions.toArray()),
    stockMovements: sort(await db.stockMovements.toArray()),
  }
}

describe('backupService', () => {
  it('export → JSON file → wipe → restore gives back the same shop data', async () => {
    const p = await addProduct({ stockQty: 9 })
    const c = await addCustomer()
    await saleService.create({ tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 2)], paymentType: 'cash', paidAmount: khr(2000) })
    await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)],
      paymentType: 'debt', paidAmount: khr(0), customerId: c.id, debtAmount: khr(1000),
    })
    const before = await snapshot()

    const file = JSON.parse(JSON.stringify(await backupService.exportAll()))   // what the user downloads
    expect(backupService.validate(file)).toBe(true)

    await backupService.clearAll()
    expect(await db.sales.count()).toBe(0)

    const stats = await backupService.restore(file)
    expect(stats).toEqual({ products: 1, customers: 1, sales: 2, debts: 1 })
    expect(await snapshot()).toEqual(before)
  })

  it('rejects files that are not a backup', () => {
    expect(backupService.validate(null)).toBe(false)
    expect(backupService.validate({ version: 1 })).toBe(false)
    expect(backupService.validate({ version: '1', tables: { products: [], customers: [], sales: [] } })).toBe(false)
  })

  // Known gaps (DATA-13 / B34) — to be closed in WP6 "Backup v2".
  it.todo('includes held invoices, categories and units')
  it.todo('refuses a backup from a newer app version')
  it.todo('keeps a snapshot of the current data before restoring')
})
