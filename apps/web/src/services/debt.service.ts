import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { addKHR, subtractKHR } from '@/lib/money'
import type { DebtTransaction, Customer, Result } from '@/types'
import type { TenantId, CustomerId, SaleId, KHR } from '@/types/branded'

export interface ChargeDebtInput {
  tenantId: TenantId
  customerId: CustomerId
  saleId: SaleId
  amount: KHR
  note?: string
}

export interface RecordPaymentInput {
  tenantId: TenantId
  customerId: CustomerId
  amount: KHR
  note?: string
}

export const debtService = {
  async charge(input: ChargeDebtInput): Promise<Result<DebtTransaction>> {
    const customer = await db.customers.get(input.customerId)
    if (!customer || customer.tenantId !== input.tenantId) {
      return { ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: input.customerId } }
    }

    const txn: DebtTransaction = {
      id: generateId(),
      tenantId: input.tenantId,
      customerId: input.customerId,
      saleId: input.saleId,
      amount: input.amount,
      type: 'charge',
      note: input.note ?? null,
      isVoid: false,
      createdAt: nowISO(),
      syncedAt: null,
    }

    const updatedCustomer: Customer = {
      ...customer,
      debtBalance: addKHR(customer.debtBalance, input.amount),
      updatedAt: nowISO(),
    }

    // Append-only: never update or delete debt transactions
    await db.transaction('rw', [db.debtTransactions, db.customers, db.syncQueue], async () => {
      await db.debtTransactions.add(txn)
      await db.customers.put(updatedCustomer)
      await enqueue({
        tenantId: input.tenantId,
        tableName: 'debt_transactions',
        recordId: txn.id,
        operation: 'INSERT',
        payload: JSON.stringify(txn),
      })
    })

    return { ok: true, data: txn }
  },

  async recordPayment(input: RecordPaymentInput): Promise<Result<DebtTransaction>> {
    const customer = await db.customers.get(input.customerId)
    if (!customer || customer.tenantId !== input.tenantId) {
      return { ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: input.customerId } }
    }

    const txn: DebtTransaction = {
      id: generateId(),
      tenantId: input.tenantId,
      customerId: input.customerId,
      saleId: null,
      amount: input.amount,
      type: 'payment',
      note: input.note ?? null,
      isVoid: false,
      createdAt: nowISO(),
      syncedAt: null,
    }

    const updatedCustomer: Customer = {
      ...customer,
      debtBalance: subtractKHR(customer.debtBalance, input.amount),
      updatedAt: nowISO(),
    }

    await db.transaction('rw', [db.debtTransactions, db.customers, db.syncQueue], async () => {
      await db.debtTransactions.add(txn)
      await db.customers.put(updatedCustomer)
      await enqueue({
        tenantId: input.tenantId,
        tableName: 'debt_transactions',
        recordId: txn.id,
        operation: 'INSERT',
        payload: JSON.stringify(txn),
      })
    })

    return { ok: true, data: txn }
  },

  async getLedger(tenantId: TenantId, customerId: CustomerId): Promise<DebtTransaction[]> {
    return db.debtTransactions
      .where('customerId')
      .equals(customerId)
      .filter((t) => t.tenantId === tenantId && !t.isVoid)
      .reverse()
      .sortBy('createdAt')
  },
}
