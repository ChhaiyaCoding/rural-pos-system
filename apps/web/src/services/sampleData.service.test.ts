import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { sampleDataService } from './sampleData.service'
import { backupService } from './backup.service'
import { TENANT, addCustomer, addProduct, resetDb } from '@/test/fixtures'

beforeEach(resetDb)

describe('sampleDataService', () => {
  it('fills an empty shop with sample products and customers', async () => {
    await sampleDataService.load(TENANT)
    expect(await db.products.where('tenantId').equals(TENANT).count()).toBeGreaterThan(0)
    expect(await db.customers.where('tenantId').equals(TENANT).count()).toBe(5)
  })

  it("never adds sample rows to a shop that already has its own data", async () => {
    const p = await addProduct({ nameKm: 'ទឹកសុទ្ធ' })
    const c = await addCustomer({ nameKm: 'សុភា' })
    await sampleDataService.load(TENANT)
    expect((await db.products.toArray()).map((x) => x.id)).toEqual([p.id])
    expect((await db.customers.toArray()).map((x) => x.id)).toEqual([c.id])
  })

  it('loading twice does not duplicate anything', async () => {
    await sampleDataService.load(TENANT)
    const n = await db.products.count()
    await sampleDataService.load(TENANT)
    expect(await db.products.count()).toBe(n)
  })

  it('"delete all data" leaves an empty shop (nothing is seeded back)', async () => {
    await sampleDataService.load(TENANT)
    await backupService.clearAll()
    expect(await db.products.count()).toBe(0)
    expect(await db.customers.count()).toBe(0)
  })
})
