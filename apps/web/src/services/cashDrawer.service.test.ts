import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { cashDrawerService } from './cashDrawer.service'
import { saleService } from './sale.service'
import { expenseService } from './expense.service'
import { CASHIER, TENANT, addProduct, khr, line, resetDb } from '@/test/fixtures'

beforeEach(resetDb)

describe('store-day summary profit', () => {
  it('net profit = sales − cost of goods − expenses', async () => {
    const drawer = await cashDrawerService.open({ tenantId: TENANT, cashierId: CASHIER, cashierName: 'សុខា', openingBalance: khr(50000) })
    const rice = await addProduct({ sellPrice: khr(5000), costPrice: khr(3500) })
    await saleService.create({ tenantId: TENANT, cashierId: CASHIER, cart: [line(rice, 3)], paymentType: 'cash', paidAmount: khr(15000) })
    await expenseService.create({ tenantId: TENANT, amount: khr(2000), categoryId: 'other' })

    // later the cost goes up — the sale keeps the cost it was sold at
    await db.products.update(rice.id, { costPrice: khr(4500) })

    const s = await cashDrawerService.getStoreDaySummary((await db.cashDrawers.get(drawer.id))!)
    expect(s.totalSales).toBe(15000)
    expect(s.costOfGoods).toBe(10500)
    expect(s.totalExpenses).toBe(2000)
    expect(s.netProfit).toBe(2500)
  })
})
