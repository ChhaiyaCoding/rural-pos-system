import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { addKHR, subtractKHR } from '@/lib/money'
import type { DebtTransaction, DebtPaymentMethod, Customer, Result } from '@/types'
import type { TenantId, CustomerId, SaleId, KHR, UUID } from '@/types/branded'

/** Payment methods for receiving debt — Cambodian shop context */
export const DEBT_METHODS: { id: DebtPaymentMethod; label: string; emoji: string }[] = [
  { id: 'cash', label: 'សាច់ប្រាក់', emoji: '💵' },
  { id: 'aba',  label: 'ABA',        emoji: '🏦' },
  { id: 'bank', label: 'ផ្ទេរ​ប្រាក់', emoji: '💳' },
]

export function debtMethodLabel(m: DebtPaymentMethod | null): string {
  return DEBT_METHODS.find((x) => x.id === m)?.label ?? '—'
}

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
  method?: DebtPaymentMethod
  note?: string
}

export interface ManualDebtInput {
  tenantId: TenantId
  customerId: CustomerId
  amount: KHR
  /** 'opening' = pre-existing/old debt · 'manual' = new debt added now */
  kind: 'opening' | 'manual'
  note?: string
  /** When the debt was incurred (ISO). Defaults to now. Drives FIFO ordering. */
  createdAt?: string
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
      method: null,
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
      method: input.method ?? null,
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

  /** Record a manual debt not tied to a sale — either an opening / pre-existing
   *  balance (old debt the customer already owed) or a new debt added by hand.
   *  Appends a charge txn with saleId=null and adds the amount to the balance. */
  async addManualDebt(input: ManualDebtInput): Promise<Result<DebtTransaction>> {
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
      type: 'charge',
      method: null,
      chargeKind: input.kind,
      note: input.note ?? null,
      isVoid: false,
      createdAt: input.createdAt ?? nowISO(),
      syncedAt: null,
    }

    const updatedCustomer: Customer = {
      ...customer,
      debtBalance: addKHR(customer.debtBalance, input.amount),
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

  /** Delete (soft-void) a manual charge (saleId=null, opening or new) and remove
   *  its amount from the balance. Safe only for unpaid charges — the UI offers
   *  this only when nothing has been paid against it; the balance is clamped at
   *  0 as a defensive backstop. */
  async voidManualCharge(input: { tenantId: TenantId; chargeId: UUID }): Promise<Result<DebtTransaction>> {
    const txn = await db.debtTransactions.get(input.chargeId)
    if (!txn || txn.tenantId !== input.tenantId) {
      return { ok: false, error: { code: 'DEBT_NOT_FOUND', debtId: input.chargeId } }
    }
    if (txn.type !== 'charge' || txn.saleId != null) {
      return { ok: false, error: { code: 'INVALID_PAYMENT', reason: 'NOT_AN_OPENING_BALANCE' } }
    }
    if (txn.isVoid) {
      return { ok: false, error: { code: 'INVALID_PAYMENT', reason: 'ALREADY_VOID' } }
    }

    const customer = await db.customers.get(txn.customerId)
    if (!customer || customer.tenantId !== input.tenantId) {
      return { ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: txn.customerId } }
    }

    const voided: DebtTransaction = { ...txn, isVoid: true, syncedAt: null }
    const nextBalance = Math.max(0, (customer.debtBalance as number) - (txn.amount as number)) as KHR
    const updatedCustomer: Customer = { ...customer, debtBalance: nextBalance, updatedAt: nowISO() }

    await db.transaction('rw', [db.debtTransactions, db.customers, db.syncQueue], async () => {
      await db.debtTransactions.put(voided)
      await db.customers.put(updatedCustomer)
      await enqueue({
        tenantId: input.tenantId,
        tableName: 'debt_transactions',
        recordId: voided.id,
        operation: 'UPDATE',
        payload: JSON.stringify(voided),
      })
    })

    return { ok: true, data: voided }
  },

  /** Void a wrong payment. Soft-voids the txn (isVoid=true, append-only safe)
   *  and restores the amount back onto the customer's debt balance.
   *  All ledger/summary/dashboard queries already filter out voided txns,
   *  so totals + FIFO invoice remaining reconcile automatically. */
  async voidPayment(input: { tenantId: TenantId; paymentId: UUID }): Promise<Result<DebtTransaction>> {
    const txn = await db.debtTransactions.get(input.paymentId)
    if (!txn || txn.tenantId !== input.tenantId) {
      return { ok: false, error: { code: 'DEBT_NOT_FOUND', debtId: input.paymentId } }
    }
    if (txn.type !== 'payment') {
      return { ok: false, error: { code: 'INVALID_PAYMENT', reason: 'NOT_A_PAYMENT' } }
    }
    if (txn.isVoid) {
      return { ok: false, error: { code: 'INVALID_PAYMENT', reason: 'ALREADY_VOID' } }
    }

    const customer = await db.customers.get(txn.customerId)
    if (!customer || customer.tenantId !== input.tenantId) {
      return { ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: txn.customerId } }
    }

    const voided: DebtTransaction = { ...txn, isVoid: true, syncedAt: null }
    const updatedCustomer: Customer = {
      ...customer,
      debtBalance: addKHR(customer.debtBalance, txn.amount),
      updatedAt: nowISO(),
    }

    await db.transaction('rw', [db.debtTransactions, db.customers, db.syncQueue], async () => {
      await db.debtTransactions.put(voided)
      await db.customers.put(updatedCustomer)
      await enqueue({
        tenantId: input.tenantId,
        tableName: 'debt_transactions',
        recordId: voided.id,
        operation: 'UPDATE',
        payload: JSON.stringify(voided),
      })
    })

    return { ok: true, data: voided }
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
