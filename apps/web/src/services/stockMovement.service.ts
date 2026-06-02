import { db } from '@/db'
import { generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import type { StockMovement, StockMovementType } from '@/types'
import type { TenantId, ProductId, SaleId } from '@/types/branded'

export interface RecordMovementInput {
  tenantId:    TenantId
  productId:   ProductId
  productName: string
  type:        StockMovementType
  delta:       number       // + add / − remove
  qtyBefore:   number
  qtyAfter:    number
  note?:       string
  saleId?:     SaleId
}

export const stockMovementService = {

  /* ── Record one movement (call inside an existing txn or standalone) ── */
  async record(input: RecordMovementInput): Promise<void> {
    const movement: StockMovement = {
      id:          generateId(),
      tenantId:    input.tenantId,
      productId:   input.productId,
      productName: input.productName,
      type:        input.type,
      delta:       input.delta,
      qtyBefore:   input.qtyBefore,
      qtyAfter:    input.qtyAfter,
      note:        input.note ?? null,
      saleId:      input.saleId ?? null,
      createdAt:   nowISO(),
    }
    await db.stockMovements.add(movement)
  },

  /* ── History for one product (newest first) ── */
  async getByProduct(productId: ProductId, limit = 50): Promise<StockMovement[]> {
    const all = await db.stockMovements
      .where('productId').equals(productId)
      .toArray()
    return all
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  },

  /* ── All movements for tenant (newest first) ── */
  async getByTenant(tenantId: TenantId, limit = 100): Promise<StockMovement[]> {
    const all = await db.stockMovements
      .where('tenantId').equals(tenantId)
      .toArray()
    return all
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  },
}
