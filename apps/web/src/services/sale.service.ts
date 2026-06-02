import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateSaleId, generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { multiplyKHR } from '@/lib/money'
import type { Sale, SaleItem, CartItem, Result } from '@/types'
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

    await db.transaction('rw', [db.sales, db.saleItems, db.syncQueue, db.products, db.stockMovements], async () => {
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
    })

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
          const debtTxn  = await db.debtTransactions
            .where('saleId').equals(saleId)
            .filter(t => t.type === 'charge' && !t.isVoid)
            .first()

          if (customer && debtTxn) {
            await db.debtTransactions.update(debtTxn.id, { isVoid: true })
            const newBalance = Math.max(0, customer.debtBalance - debtTxn.amount) as KHR
            await db.customers.update(sale.customerId, {
              debtBalance: newBalance,
              updatedAt:   now,
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
