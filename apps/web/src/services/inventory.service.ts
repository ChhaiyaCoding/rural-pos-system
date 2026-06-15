import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateProductId, generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import type { Product, Result } from '@/types'
import type { TenantId, ProductId, KHR } from '@/types/branded'

export interface CreateProductInput {
  tenantId: TenantId
  nameKm: string
  barcode?: string
  unit: string
  categoryId?: string
  emoji?: string
  imageUri?: string
  costPrice: KHR
  sellPrice: KHR
  stockQty?: number
  lowStockThreshold?: number
}

export const inventoryService = {
  async create(input: CreateProductInput): Promise<Result<Product>> {
    const now = nowISO()
    const product: Product = {
      id: generateProductId(),
      tenantId: input.tenantId,
      nameKm: input.nameKm,
      barcode: input.barcode ?? null,
      unit: input.unit,
      categoryId: input.categoryId ?? 'other',
      emoji: input.emoji ?? '📦',
      imageUri: input.imageUri ?? null,
      costPrice: input.costPrice,
      sellPrice: input.sellPrice,
      stockQty: input.stockQty ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncedAt: null,
    }

    await db.transaction('rw', [db.products, db.syncQueue], async () => {
      await db.products.add(product)
      await enqueue({
        tenantId: input.tenantId,
        tableName: 'products',
        recordId: product.id,
        operation: 'INSERT',
        payload: JSON.stringify(product),
      })
    })

    return { ok: true, data: product }
  },

  async getByTenant(tenantId: TenantId): Promise<Product[]> {
    return db.products
      .where('tenantId')
      .equals(tenantId)
      .filter((p) => !p.deletedAt)
      .toArray()
  },

  async findByBarcode(tenantId: TenantId, barcode: string): Promise<Product | null> {
    const result = await db.products
      .where('barcode')
      .equals(barcode)
      .filter((p) => p.tenantId === tenantId && !p.deletedAt)
      .first()
    return result ?? null
  },

  async adjustStock(
    tenantId: TenantId,
    productId: ProductId,
    delta: number,
    note?: string
  ): Promise<Result<Product>> {
    const product = await db.products.get(productId)
    if (!product || product.tenantId !== tenantId) {
      return { ok: false, error: { code: 'PRODUCT_NOT_FOUND', productId } }
    }

    const now       = nowISO()
    const qtyBefore = product.stockQty
    const qtyAfter  = Math.max(0, product.stockQty + delta)

    const updated: Product = {
      ...product,
      stockQty:  qtyAfter,
      updatedAt: now,
    }

    await db.transaction('rw', [db.products, db.syncQueue, db.stockMovements], async () => {
      await db.products.put(updated)
      // Log stock movement: positive delta = restock, negative = manual adjustment
      await db.stockMovements.add({
        id:          generateId(),
        tenantId,
        productId,
        productName: product.nameKm,
        type:        delta >= 0 ? 'restock' : 'adjustment',
        delta:       qtyAfter - qtyBefore,
        qtyBefore,
        qtyAfter,
        note:        note?.trim() || null,
        saleId:      null,
        createdAt:   now,
      })
      await enqueue({
        tenantId,
        tableName: 'products',
        recordId: productId,
        operation: 'UPDATE',
        payload: JSON.stringify(updated),
      })
    })

    return { ok: true, data: updated }
  },
}
