import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateSaleId, generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { addKHR, multiplyKHR } from '@/lib/money'
import { saleRemaining } from '@/features/debt/reconcile'
import type { Sale, SaleItem, CartItem, DebtTransaction, Result } from '@/types'
import type { TenantId, UserId, CustomerId, SaleId, KHR } from '@/types/branded'

export interface CreateSaleInput {
  tenantId: TenantId
  cashierId: UserId
  cart: CartItem[]
  paymentType: Sale['paymentType']
  paidAmount: KHR
  discount?: KHR
  customerId?: CustomerId
  note?: string
  receiptNumber?: string
  /** Debt to charge to `customerId` (debt = full amount, partial = unpaid part).
   *  Written in the same transaction as the sale: both are saved, or neither. */
  debtAmount?: KHR
}

/** Build a receipt number: YYYYMMDD + 4 random chars */
export function makeReceiptNumber(iso: string): string {
  const shortDate = iso.slice(0, 10).replace(/-/g, '')
  const shortRef  = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${shortDate}-${shortRef}`
}

export const saleService = {
  async create(input: CreateSaleInput): Promise<Result<Sale>> {
    const saleId = generateSaleId()
    const now = nowISO()

    // Per-line net = unitPrice*qty − lineDiscount (clamped ≥ 0)
    const lineNet = (item: CartItem): KHR => {
      const gross = multiplyKHR(item.unitPrice, item.qty)
      return Math.max(0, gross - (item.lineDiscount ?? 0)) as KHR
    }

    const subtotal = input.cart.reduce(
      (sum, item) => (sum + lineNet(item)) as KHR,
      0 as KHR
    )
    const totalAmount = Math.max(subtotal - (input.discount ?? 0), 0) as KHR

    const sale: Sale = {
      id: saleId,
      tenantId: input.tenantId,
      cashierId: input.cashierId,
      receiptNumber: input.receiptNumber ?? makeReceiptNumber(now),
      totalAmount,
      paidAmount: input.paidAmount,
      paymentType: input.paymentType,
      customerId: input.customerId ?? null,
      note: input.note ?? null,
      isVoid: false,
      createdAt: now,
      syncedAt: null,
    }

    const saleItems: SaleItem[] = input.cart.map((item) => ({
      id: generateId(),
      saleId,
      tenantId: input.tenantId,
      productId: item.product.id,
      nameKm: item.product.nameKm,
      qty: item.qty,
      unitPrice: item.unitPrice,
      subtotal: lineNet(item),   // net after per-line discount
    }))

    const debtAmount = input.debtAmount ?? (0 as KHR)
    if (debtAmount > 0 && !input.customerId) {
      return { ok: false, error: { code: 'INVALID_PAYMENT', reason: 'DEBT_WITHOUT_CUSTOMER' } }
    }

    try {
      await db.transaction(
        'rw',
        [db.sales, db.saleItems, db.syncQueue, db.products, db.stockMovements, db.customers, db.debtTransactions],
        async () => {
          await db.sales.add(sale)
          await db.saleItems.bulkAdd(saleItems)

          // Deduct stock for each sold item + log movement
          for (const item of input.cart) {
            const p = await db.products.get(item.product.id)
            if (p) {
              const qtyBefore = p.stockQty
              const qtyAfter  = Math.max(0, p.stockQty - item.qty)
              await db.products.update(item.product.id, {
                stockQty: qtyAfter,
                updatedAt: now,
              })
              await db.stockMovements.add({
                id:          generateId(),
                tenantId:    input.tenantId,
                productId:   item.product.id,
                productName: p.nameKm,
                type:        'sale',
                delta:       qtyAfter - qtyBefore,
                qtyBefore,
                qtyAfter,
                note:        null,
                saleId,
                createdAt:   now,
              })
            }
          }

          await enqueue({
            tenantId: input.tenantId,
            tableName: 'sales',
            recordId: saleId,
            operation: 'INSERT',
            payload: JSON.stringify(sale),
          })

          // Debt charge — same transaction, so a sale can never exist without its debt
          if (debtAmount > 0 && input.customerId) {
            const customer = await db.customers.get(input.customerId)
            if (!customer || customer.tenantId !== input.tenantId) {
              throw new Error('CUSTOMER_NOT_FOUND')   // aborts the whole transaction
            }
            const txn: DebtTransaction = {
              id: generateId(),
              tenantId: input.tenantId,
              customerId: input.customerId,
              saleId,
              amount: debtAmount,
              type: 'charge',
              method: null,
              note: null,
              isVoid: false,
              createdAt: now,
              syncedAt: null,
            }
            await db.debtTransactions.add(txn)
            await db.customers.update(input.customerId, {
              debtBalance: addKHR(customer.debtBalance, debtAmount),
              updatedAt:   now,
            })
            await enqueue({
              tenantId: input.tenantId,
              tableName: 'debt_transactions',
              recordId: txn.id,
              operation: 'INSERT',
              payload: JSON.stringify(txn),
            })
          }
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message === 'CUSTOMER_NOT_FOUND' && input.customerId) {
        return { ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: input.customerId } }
      }
      return { ok: false, error: { code: 'UNKNOWN', message } }
    }

    return { ok: true, data: sale }
  },

  async getByTenant(tenantId: TenantId, limit = 50): Promise<Sale[]> {
    return db.sales
      .where('tenantId')
      .equals(tenantId)
      .filter((s) => !s.isVoid)
      .reverse()
      .limit(limit)
      .sortBy('createdAt')
  },

  /* ── Void (cancel) a sale ────────────────────────────────────
   *  1. Mark sale isVoid = true
   *  2. Restore stock for every sold item
   *  3. Reverse debt transaction if debt / partial sale
   * ─────────────────────────────────────────────────────────── */
  async voidSale(saleId: SaleId, tenantId: TenantId): Promise<Result<Sale>> {
    const sale = await db.sales.get(saleId)
    if (!sale || sale.tenantId !== tenantId) {
      return { ok: false, error: { code: 'SALE_NOT_FOUND', saleId } }
    }
    if (sale.isVoid) {
      return { ok: false, error: { code: 'SALE_ALREADY_VOID', saleId } }
    }

    // A debt invoice the customer has already paid (fully or partly) cannot be
    // voided: removing its charge would also wipe debt owed on other invoices.
    // The payment must be voided first.
    if (await saleHasDebtPayments(sale)) {
      return { ok: false, error: { code: 'INVALID_PAYMENT', reason: 'SALE_HAS_PAYMENTS' } }
    }

    const saleItems = await db.saleItems.where('saleId').equals(saleId).toArray()
    const now = nowISO()

    await db.transaction(
      'rw',
      [db.sales, db.saleItems, db.products, db.customers, db.debtTransactions, db.syncQueue, db.stockMovements],
      async () => {
        // 1. Mark sale void
        await db.sales.update(saleId, { isVoid: true })

        // 2. Restore stock + log movement
        for (const item of saleItems) {
          const product = await db.products.get(item.productId)
          if (product) {
            const qtyBefore = product.stockQty
            const qtyAfter  = product.stockQty + item.qty
            await db.products.update(item.productId, {
              stockQty: qtyAfter,
              updatedAt: now,
            })
            await db.stockMovements.add({
              id:          generateId(),
              tenantId,
              productId:   item.productId,
              productName: product.nameKm,
              type:        'void_return',
              delta:       item.qty,
              qtyBefore,
              qtyAfter,
              note:        'លុបការលក់',
              saleId,
              createdAt:   now,
            })
          }
        }

        // 3. Reverse debt if applicable
        if (sale.customerId && (sale.paymentType === 'debt' || sale.paymentType === 'partial')) {
          const customer = await db.customers.get(sale.customerId)
          // debtTransactions has no saleId index — go through customerId (indexed)
          const debtTxn  = await db.debtTransactions
            .where('customerId').equals(sale.customerId)
            .filter(t => t.saleId === saleId && t.type === 'charge' && !t.isVoid)
            .first()

          if (customer && debtTxn) {
            const voided: DebtTransaction = { ...debtTxn, isVoid: true, syncedAt: null }
            await db.debtTransactions.put(voided)
            const newBalance = Math.max(0, customer.debtBalance - debtTxn.amount) as KHR
            await db.customers.update(sale.customerId, {
              debtBalance: newBalance,
              updatedAt:   now,
            })
            await enqueue({
              tenantId,
              tableName: 'debt_transactions',
              recordId:  voided.id,
              operation: 'UPDATE',
              payload:   JSON.stringify(voided),
            })
          }
        }

        // 4. Enqueue sync
        await enqueue({
          tenantId,
          tableName: 'sales',
          recordId:  saleId,
          operation: 'UPDATE',
          payload:   JSON.stringify({ ...sale, isVoid: true }),
        })
      }
    )

    const updated = await db.sales.get(saleId)
    if (!updated) return { ok: false, error: { code: 'SALE_NOT_FOUND', saleId } }
    return { ok: true, data: updated }
  },
}

/** True when any payment has been applied to this debt/partial sale's invoice. */
export async function saleHasDebtPayments(sale: Sale): Promise<boolean> {
  if (!sale.customerId || (sale.paymentType !== 'debt' && sale.paymentType !== 'partial')) return false
  const customerId = sale.customerId
  const [debtSales, txns] = await Promise.all([
    db.sales.where('tenantId').equals(sale.tenantId)
      .filter((s) => s.customerId === customerId && !s.isVoid && (s.paymentType === 'debt' || s.paymentType === 'partial'))
      .toArray(),
    db.debtTransactions.where('customerId').equals(customerId)
      .filter((t) => t.tenantId === sale.tenantId && !t.isVoid)
      .toArray(),
  ])
  const owed = (sale.totalAmount as number) - (sale.paidAmount as number)
  return saleRemaining(String(sale.id), debtSales, txns) < owed
}
