import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { debtService } from './debt.service'
import { TENANT, addCustomer, khr, ledgerBalance, resetDb } from '@/test/fixtures'
import type { UUID } from '@/types/branded'

beforeEach(resetDb)

describe('debtService', () => {
  it('payment lowers the balance, voiding it restores the balance', async () => {
    const c = await addCustomer()
    await debtService.addManualDebt({ tenantId: TENANT, customerId: c.id, amount: khr(10000), kind: 'opening' })
    const pay = await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(4000), method: 'aba' })
    expect(pay.ok).toBe(true)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(6000)

    if (!pay.ok) return
    expect((await debtService.voidPayment({ tenantId: TENANT, paymentId: pay.data.id })).ok).toBe(true)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(10000)
    expect(await ledgerBalance(c.id)).toBe(10000)
  })

  it('a payment cannot be voided twice', async () => {
    const c = await addCustomer({ debtBalance: khr(5000) })
    const pay = await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(5000) })
    if (!pay.ok) throw new Error('setup failed')
    await debtService.voidPayment({ tenantId: TENANT, paymentId: pay.data.id })
    const again = await debtService.voidPayment({ tenantId: TENANT, paymentId: pay.data.id })
    expect(again.ok).toBe(false)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(5000)
  })

  it('a manual charge can be deleted; a sale-linked charge cannot go through that path', async () => {
    const c = await addCustomer()
    const manual = await debtService.addManualDebt({ tenantId: TENANT, customerId: c.id, amount: khr(3000), kind: 'manual' })
    const fromSale = await debtService.charge({ tenantId: TENANT, customerId: c.id, saleId: 'sale-1' as never, amount: khr(2000) })
    if (!manual.ok || !fromSale.ok) throw new Error('setup failed')

    expect((await debtService.voidManualCharge({ tenantId: TENANT, chargeId: manual.data.id })).ok).toBe(true)
    expect((await debtService.voidManualCharge({ tenantId: TENANT, chargeId: fromSale.data.id as UUID })).ok).toBe(false)
    expect((await db.customers.get(c.id))?.debtBalance).toBe(2000)
    expect(await ledgerBalance(c.id)).toBe(2000)
  })

  it("never writes to another shop's customer", async () => {
    const c = await addCustomer()
    const res = await debtService.recordPayment({ tenantId: 'other-shop' as never, customerId: c.id, amount: khr(1000) })
    expect(res.ok).toBe(false)
    expect(await db.debtTransactions.count()).toBe(0)
  })

  it('balance always equals the ledger after a mixed sequence', async () => {
    const c = await addCustomer()
    await debtService.addManualDebt({ tenantId: TENANT, customerId: c.id, amount: khr(7000), kind: 'opening' })
    await debtService.charge({ tenantId: TENANT, customerId: c.id, saleId: 's1' as never, amount: khr(2500) })
    const p1 = await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(4000) })
    await debtService.recordPayment({ tenantId: TENANT, customerId: c.id, amount: khr(1500) })
    if (p1.ok) await debtService.voidPayment({ tenantId: TENANT, paymentId: p1.data.id })

    const balance = (await db.customers.get(c.id))?.debtBalance
    expect(balance).toBe(8000)
    expect(await ledgerBalance(c.id)).toBe(balance)
  })
})
