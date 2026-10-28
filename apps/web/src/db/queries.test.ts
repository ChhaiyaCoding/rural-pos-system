import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { lastPurchaseAt, newestSales, salesBetween, salesOfCustomer } from './queries'
import { TENANT, resetDb } from '@/test/fixtures'
import type { Sale } from '@/types'

beforeEach(resetDb)

let n = 0
const sale = (createdAt: string, over: Partial<Sale> = {}): Sale => ({
  id: `s${++n}` as Sale['id'], tenantId: TENANT, cashierId: 'c' as Sale['cashierId'], receiptNumber: `R${n}`,
  totalAmount: 1000 as Sale['totalAmount'], paidAmount: 1000 as Sale['paidAmount'], paymentType: 'cash',
  customerId: null, note: null, isVoid: false, createdAt, syncedAt: null, ...over,
})

describe('indexed sales queries', () => {
  it('salesBetween returns only this shop, inside the range, oldest first', async () => {
    await db.sales.bulkAdd([
      sale('2026-10-01T10:00:00.000Z'),
      sale('2026-10-02T10:00:00.000Z'),
      sale('2026-10-03T10:00:00.000Z'),
      sale('2026-10-02T12:00:00.000Z', { tenantId: 'other-shop' as Sale['tenantId'] }),
    ])
    const got = await salesBetween(TENANT, '2026-10-02T00:00:00.000Z').toArray()
    expect(got.map((s) => s.createdAt)).toEqual(['2026-10-02T10:00:00.000Z', '2026-10-03T10:00:00.000Z'])
    const day = await salesBetween(TENANT, '2026-10-02T00:00:00.000Z', '2026-10-02T23:59:59.999Z').toArray()
    expect(day).toHaveLength(1)
  })

  it('newestSales is newest first', async () => {
    await db.sales.bulkAdd([sale('2026-10-01T00:00:00.000Z'), sale('2026-10-05T00:00:00.000Z'), sale('2026-10-03T00:00:00.000Z')])
    expect((await newestSales(TENANT).limit(2).toArray()).map((s) => s.createdAt.slice(0, 10)))
      .toEqual(['2026-10-05', '2026-10-03'])
  })

  it("salesOfCustomer and lastPurchaseAt only see that customer's sales; void is skipped", async () => {
    const a = 'cust-a' as Sale['customerId'] & string
    await db.sales.bulkAdd([
      sale('2026-10-01T00:00:00.000Z', { customerId: a as never }),
      sale('2026-10-04T00:00:00.000Z', { customerId: a as never, isVoid: true }),
      sale('2026-10-02T00:00:00.000Z', { customerId: 'cust-b' as never }),
      sale('2026-10-03T00:00:00.000Z'),
    ])
    expect(await salesOfCustomer(TENANT, a as never).count()).toBe(2)
    expect(await lastPurchaseAt(TENANT, a as never)).toBe('2026-10-01T00:00:00.000Z')
    expect(await lastPurchaseAt(TENANT, 'nobody' as never)).toBeUndefined()
  })
})
