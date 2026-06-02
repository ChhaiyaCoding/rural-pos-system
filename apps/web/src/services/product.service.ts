import { db } from '@/db'
import { generateProductId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { MOCK_PRODUCTS } from '@/features/sales/mock-products'
import type { Product } from '@/types'
import type { TenantId, ProductId, KHR } from '@/types/branded'

export interface CreateProductInput {
  tenantId: TenantId
  nameKm: string
  nameEn?: string
  categoryId: string
  emoji: string
  imageUri?: string | null
  unit: string
  sellPrice: KHR
  costPrice: KHR
  stockQty: number
  lowStockThreshold: number
  barcode?: string | null
}

export const productService = {
  async list(tenantId: TenantId): Promise<Product[]> {
    return db.products
      .where('tenantId').equals(tenantId)
      .filter((p) => !p.deletedAt)
      .toArray()
  },

  async create(input: CreateProductInput): Promise<Product> {
    const now = nowISO()
    const product: Product = {
      id:                generateProductId(),
      tenantId:          input.tenantId,
      nameKm:            input.nameKm,
      ...(input.nameEn?.trim() ? { nameEn: input.nameEn.trim() } : {}),
      barcode:           input.barcode ?? null,
      unit:              input.unit,
      categoryId:        input.categoryId,
      emoji:             input.emoji,
      imageUri:          input.imageUri ?? null,
      costPrice:         input.costPrice,
      sellPrice:         input.sellPrice,
      stockQty:          input.stockQty,
      lowStockThreshold: input.lowStockThreshold,
      createdAt:         now,
      updatedAt:         now,
      deletedAt:         null,
      syncedAt:          null,
    }
    await db.products.add(product)
    return product
  },

  async update(id: ProductId, patch: Partial<Omit<Product, 'id' | 'tenantId' | 'createdAt'>>): Promise<void> {
    await db.products.update(id, { ...patch, updatedAt: nowISO() })
  },

  async softDelete(id: ProductId): Promise<void> {
    await db.products.update(id, { deletedAt: nowISO(), updatedAt: nowISO() })
  },

  async adjustStock(id: ProductId, delta: number): Promise<void> {
    const p = await db.products.get(id)
    if (!p) return
    await db.products.update(id, {
      stockQty: Math.max(0, p.stockQty + delta),
      updatedAt: nowISO(),
    })
  },

  async seedIfEmpty(tenantId: TenantId): Promise<void> {
    const count = await db.products.where('tenantId').equals(tenantId).count()
    if (count > 0) return
    const now = nowISO()
    const seeded = MOCK_PRODUCTS.map((p) => ({
      ...p,
      tenantId,
      createdAt: now,
      updatedAt: now,
    }))
    await db.products.bulkPut(seeded)
  },
}
