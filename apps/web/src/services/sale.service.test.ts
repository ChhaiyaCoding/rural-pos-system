import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { saleService } from './sale.service'
import { debtService } from './debt.service'
import {
  CASHIER, TENANT, addCustomer, addProduct, khr, ledgerBalance, line, resetDb,
} from '@/test/fixtures'
import type { SaleId } from '@/types/branded'

beforeEach(resetDb)

/** Let the clock move so createdAt timestamps differ */
const tick = () => new Promise((r) => setTimeout(r, 5))

describe('saleService.create', () => {
  it('cash sale: totals, stock deduction, stock movement and sync queue', async () => {
    const water = await addProduct({ sellPrice: khr(1000), stockQty: 10 })
    const rice  = await addProduct({ sellPrice: khr(5000), stockQty: 4 })

    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER,
      cart: [line(water, 3, 500), line(rice, 2)],   // 3,000 − 500 + 10,000
      paymentType: 'cash', paidAmount: khr(20000), discount: khr(500),
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.totalAmount).toBe(12000)        // 12,500 − 500 sale discount
    expect((await db.saleItems.where('saleId').equals(res.data.id).toArray()).map((i) => i.subtotal).sort())
      .toEqual([10000, 2500])
    expect((await db.products.get(water.id))?.stockQty).toBe(7)
    expect((await db.products.get(rice.id))?.stockQty).toBe(2)
    const moves = await db.stockMovements.toArray()
    expect(moves).toHaveLength(2)
    expect(moves.every((m) => m.type === 'sale' && m.saleId === res.data.id)).toBe(true)
    expect(await db.debtTransactions.count()).toBe(0)
    expect((await db.syncQueue.toArray()).map((q) => q.tableName)).toEqual(['sales'])
    // the cost price at the time of sale is kept for profit
    expect((await db.saleItems.toArray()).map((i) => i.unitCost)).toEqual([800, 800])
  })

  it('debt sale writes the sale and the debt charge together', async () => {
    const p = await addProduct({ sellPrice: khr(2500) })
    const c = await addCustomer({ debtBalance: khr(1000) })

    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 2)],
      paymentType: 'debt', paidAmount: khr(0), customerId: c.id, debtAmount: khr(5000),
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return
    const charge = await db.debtTransactions.toArray()
    expect(charge).toHaveLength(1)
    expect(charge[0]).toMatchObject({ type: 'charge', amount: 5000, saleId: res.data.id, customerId: c.id })
    expect((await db.customers.get(c.id))?.debtBalance).toBe(6000)
    expect((await db.syncQueue.toArray()).map((q) => q.tableName).sort()).toEqual(['debt_transactions', 'sales'])
  })

  it('partial payment charges only the unpaid part', async () => {
    const p = await addProduct({ sellPrice: khr(10000) })
    const c = await addCustomer()
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)],
      paymentType: 'debt', paidAmount: khr(4000), customerId: c.id, debtAmount: khr(6000),
    })
    expect(res.ok).toBe(true)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(6000)
    expect(await ledgerBalance(c.id)).toBe(6000)
  })

  it('rolls everything back when the debt cannot be recorded', async () => {
    const p = await addProduct({ stockQty: 5 })
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 2)],
      paymentType: 'debt', paidAmount: khr(0),
      customerId: 'missing-customer' as never, debtAmount: khr(2000),
    })

    expect(res).toEqual({ ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: 'missing-customer' } })
    expect(await db.sales.count()).toBe(0)
    expect(await db.saleItems.count()).toBe(0)
    expect(await db.stockMovements.count()).toBe(0)
    expect(await db.syncQueue.count()).toBe(0)
    expect((await db.products.get(p.id))?.stockQty).toBe(5)
  })

  it('refuses debt without a customer and writes nothing', async () => {
    const p = await addProduct()
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)],
      paymentType: 'debt', paidAmount: khr(0), debtAmount: khr(1000),
    })
    expect(res.ok).toBe(false)
    expect(await db.sales.count()).toBe(0)
  })
})

describe('saleService.voidSale', () => {
  async function debtSale(customerId: Parameters<typeof debtService.charge>[0]['customerId'], amount: number) {
    const p = await addProduct({ sellPrice: khr(amount), stockQty: 10 })
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)],
      paymentType: 'debt', paidAmount: khr(0), customerId, debtAmount: khr(amount),
    })
    if (!res.ok) throw new Error('setup failed')
    return { sale: res.data, product: p }
  }

  it('voids a cash sale and puts the stock back', async () => {
    const p = await addProduct({ stockQty: 10 })
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 4)],
      paymentType: 'cash', paidAmount: khr(4000),
    })
    if (!res.ok) throw new Error('setup failed')

    const v = await saleService.voidSale(res.data.id, TENANT)
    expect(v.ok).toBe(true)
    expect((await db.sales.get(res.data.id))?.isVoid).toBe(true)
    expect((await db.products.get(p.id))?.stockQty).toBe(10)
    expect((await db.stockMovements.where('type').equals('void_return').toArray())[0]?.delta).toBe(4)
  })

  it('voids an unpaid debt sale and removes its debt', async () => {
    const c = await addCustomer()
    const { sale, product } = await debtSale(c.id, 3000)

    const v = await saleService.voidSale(sale.id, TENANT)
    expect(v.ok).toBe(true)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(0)
    expect(await ledgerBalance(c.id)).toBe(0)
    expect((await db.products.get(product.id))?.stockQty).toBe(10)
    const charge = (await db.debtTransactions.toArray())[0]
    expect(charge?.isVoid).toBe(true)
    // Same-millisecond rows have no defined order, so compare as a set
    expect((await db.syncQueue.filter((q) => q.recordId === charge!.id).toArray()).map((q) => q.operation).sort())
      .toEqual(['INSERT', 'UPDATE'])
  })

  it('blocks voiding an invoice the customer already paid', async () => {
    const c = await addCustomer()
    const { sale } = await debtSale(c.id, 2000)
    await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(2000), appliesToId: sale.id })

    const v = await saleService.voidSale(sale.id, TENANT)
    expect(v).toEqual({ ok: false, error: { code: 'INVALID_PAYMENT', reason: 'SALE_HAS_PAYMENTS' } })
    expect((await db.sales.get(sale.id))?.isVoid).toBe(false)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(0)
  })

  it('blocks voiding an invoice covered by an older pooled (FIFO) payment', async () => {
    const c = await addCustomer()
    const { sale } = await debtSale(c.id, 2000)
    await tick()                                   // FIFO needs A to be strictly older than B
    await debtSale(c.id, 4000)
    await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(1000) }) // no appliesToId

    const v = await saleService.voidSale(sale.id, TENANT)
    expect(v.ok).toBe(false)
  })

  it("voiding an unpaid invoice never touches another invoice's debt (DATA-09)", async () => {
    const c = await addCustomer()
    const a = await debtSale(c.id, 2000)
    const b = await debtSale(c.id, 4000)
    await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(2000), appliesToId: a.sale.id })
    expect((await db.customers.get(c.id))?.debtBalance).toBe(4000)

    expect((await saleService.voidSale(a.sale.id, TENANT)).ok).toBe(false)   // paid → blocked
    expect((await saleService.voidSale(b.sale.id, TENANT)).ok).toBe(true)    // unpaid → fine
    expect((await db.customers.get(c.id))?.debtBalance).toBe(0)
    expect(await ledgerBalance(c.id)).toBe(0)
  })

  it('cannot void the same sale twice', async () => {
    const p = await addProduct()
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)], paymentType: 'cash', paidAmount: khr(1000),
    })
    if (!res.ok) throw new Error('setup failed')
    await saleService.voidSale(res.data.id, TENANT)
    const again = await saleService.voidSale(res.data.id, TENANT)
    expect(again).toEqual({ ok: false, error: { code: 'SALE_ALREADY_VOID', saleId: res.data.id } })
    expect((await db.products.get(p.id))?.stockQty).toBe(10)
  })

  it("refuses another shop's sale", async () => {
    const p = await addProduct()
    const res = await saleService.create({
      tenantId: TENANT, cashierId: CASHIER, cart: [line(p, 1)], paymentType: 'cash', paidAmount: khr(1000),
    })
    if (!res.ok) throw new Error('setup failed')
    const v = await saleService.voidSale(res.data.id as SaleId, 'other-shop' as never)
    expect(v.ok).toBe(false)
    expect((await db.sales.get(res.data.id))?.isVoid).toBe(false)
  })
})
