import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { BACKUP_VERSION, BackupError, backupService, type BackupFile } from './backup.service'
import { saleService } from './sale.service'
import { heldInvoiceService } from './heldInvoice.service'
import { CASHIER, TENANT, addCustomer, addProduct, khr, line, resetDb } from '@/test/fixtures'

beforeEach(async () => {
  await backupService.undoLastRestore()   // consume any snapshot left by another test…
  await resetDb()                         // …then start from an empty device
  localStorage.clear()
})

async function snapshot() {
  const sort = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id))
  return {
    products: sort(await db.products.toArray()),
    customers: sort(await db.customers.toArray()),
    sales: sort(await db.sales.toArray()),
    saleItems: sort(await db.saleItems.toArray()),
    debtTransactions: sort(await db.debtTransactions.toArray()),
    stockMovements: sort(await db.stockMovements.toArray()),
    heldInvoices: sort(await db.heldInvoices.toArray()),
  }
}

/** A small shop: a cash sale, a debt sale, a held cart, custom settings */
async function seedShop() {
  const p = await addProduct({ stockQty: 9 })
  const c = await addCustomer()
  await saleService.create({ tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 2)], paymentType: 'cash', paidAmount: khr(2000) })
  await saleService.create({
    tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)],
    paymentType: 'debt', paidAmount: khr(0), customerId: c.id, debtAmount: khr(1000),
  })
  await heldInvoiceService.hold({ tenantId: TENANT, items: [line(p, 3)], total: khr(3000), count: 3 })
  localStorage.setItem('pos-store-profile', JSON.stringify({ state: { storeName: 'ហាងសុភា', exchangeRate: 4100 }, version: 0 }))
  localStorage.setItem('pos-categories', JSON.stringify({ state: { categories: [{ id: 'veg', label: 'បន្លែ' }] }, version: 0 }))
  localStorage.setItem('pos-units', JSON.stringify({ state: { units: ['ដប', 'កេស'] }, version: 0 }))
}

/** What the user downloads and later picks again */
const asFile = async (): Promise<BackupFile> => JSON.parse(JSON.stringify(await backupService.exportAll()))

describe('backupService', () => {
  it('export → JSON file → wipe → restore gives back the same shop, settings included', async () => {
    await seedShop()
    const before = await snapshot()
    const settingsBefore = ['pos-store-profile', 'pos-categories', 'pos-units'].map((k) => localStorage.getItem(k))

    const file = await asFile()
    expect(file.version).toBe(BACKUP_VERSION)
    expect(backupService.validate(file)).toBe(true)

    await backupService.clearAll()
    localStorage.clear()
    expect(await db.sales.count()).toBe(0)

    const stats = await backupService.restore(file)
    expect(stats).toEqual({ products: 1, customers: 1, sales: 2, debts: 1 })
    expect(await snapshot()).toEqual(before)
    expect(before.heldInvoices).toHaveLength(1)
    expect(['pos-store-profile', 'pos-categories', 'pos-units'].map((k) => localStorage.getItem(k))).toEqual(settingsBefore)
  })

  it('rejects files that are not a backup', () => {
    expect(backupService.validate(null)).toBe(false)
    expect(backupService.validate({ version: 1 })).toBe(false)
    expect(backupService.validate({ version: '1', tables: { products: [], customers: [], sales: [] } })).toBe(false)
    expect(() => backupService.check({ hello: 'world' })).toThrowError(new BackupError('INVALID_BACKUP'))
  })

  it('refuses a backup made by a newer app version, and leaves the data alone', async () => {
    await seedShop()
    const before = await snapshot()
    const newer = { ...(await asFile()), version: BACKUP_VERSION + 1 }

    expect(() => backupService.check(newer)).toThrowError(new BackupError('BACKUP_TOO_NEW'))
    await expect(backupService.restore(newer)).rejects.toThrowError('BACKUP_TOO_NEW')
    expect(await snapshot()).toEqual(before)
  })

  it('still restores an old v1 file (no held invoices / categories / units)', async () => {
    await seedShop()
    const v1 = await asFile()
    v1.version = 1
    delete v1.settings
    delete v1.tables.heldInvoices
    const categoriesNow = localStorage.getItem('pos-categories')

    await backupService.restore(v1)
    expect(await db.sales.count()).toBe(2)
    expect(await db.heldInvoices.count()).toBe(0)
    expect(localStorage.getItem('pos-categories')).toBe(categoriesNow)   // kept, not wiped
  })

  it('a wrong restore can be undone: the previous data comes back exactly', async () => {
    await seedShop()
    const mine = await snapshot()
    const otherPhone: BackupFile = { ...(await asFile()), tables: {
      products: [], customers: [], sales: [], saleItems: [], debtTransactions: [],
      cashDrawers: [], stockMovements: [], expenses: [], heldInvoices: [],
    } }

    await backupService.restore(otherPhone)
    expect(await db.sales.count()).toBe(0)
    expect(await backupService.lastRestoreSnapshotAt()).not.toBeNull()

    expect(await backupService.undoLastRestore()).toEqual({ products: 1, customers: 1, sales: 2, debts: 1 })
    expect(await snapshot()).toEqual(mine)
    expect(await backupService.lastRestoreSnapshotAt()).toBeNull()   // one undo only
  })

  it('tracks days since the last backup for the weekly reminder', () => {
    expect(backupService.daysSinceBackup()).toBeNull()
    const now = new Date('2026-10-26T10:00:00Z')
    backupService.markBackedUp(new Date('2026-10-18T09:00:00Z'))
    expect(backupService.daysSinceBackup(now)).toBe(8)
    backupService.markBackedUp(now)
    expect(backupService.daysSinceBackup(now)).toBe(0)
  })
})
