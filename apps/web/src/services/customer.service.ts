import { db } from '@/db'
import { enqueue } from '@/sync/queue'
import { generateCustomerId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import { toKHR } from '@/lib/money'
import type { Customer, Result } from '@/types'
import type { TenantId, CustomerId } from '@/types/branded'

export interface CreateCustomerInput {
  tenantId: TenantId
  nameKm: string
  phone?: string
  address?: string
  imageUri?: string
}

export const customerService = {
  async create(input: CreateCustomerInput): Promise<Result<Customer>> {
    const now = nowISO()
    const customer: Customer = {
      id: generateCustomerId(),
      tenantId: input.tenantId,
      nameKm: input.nameKm,
      phone: input.phone ?? null,
      address: input.address ?? null,
      imageUri: input.imageUri ?? null,
      debtBalance: toKHR(0),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncedAt: null,
    }

    await db.transaction('rw', [db.customers, db.syncQueue], async () => {
      await db.customers.add(customer)
      await enqueue({
        tenantId: input.tenantId,
        tableName: 'customers',
        recordId: customer.id,
        operation: 'INSERT',
        payload: JSON.stringify(customer),
      })
    })

    return { ok: true, data: customer }
  },

  async getByTenant(tenantId: TenantId): Promise<Customer[]> {
    return db.customers
      .where('tenantId')
      .equals(tenantId)
      .filter((c) => !c.deletedAt)
      .toArray()
  },

  async search(tenantId: TenantId, query: string): Promise<Customer[]> {
    const q = query.toLowerCase()
    return db.customers
      .where('tenantId')
      .equals(tenantId)
      .filter(
        (c) =>
          !c.deletedAt &&
          (c.nameKm.toLowerCase().includes(q) ||
            (c.phone ?? '').includes(q))
      )
      .toArray()
  },

  async update(
    id: CustomerId,
    patch: {
      nameKm?: string
      phone?: string | null
      address?: string | null
      imageUri?: string | null
    }
  ): Promise<Result<Customer>> {
    const now = nowISO()
    await db.transaction('rw', [db.customers, db.syncQueue], async () => {
      await db.customers.update(id, { ...patch, updatedAt: now })
      const updated = await db.customers.get(id)
      if (updated) {
        await enqueue({
          tenantId:  updated.tenantId,
          tableName: 'customers',
          recordId:  id,
          operation: 'UPDATE',
          payload:   JSON.stringify(updated),
        })
      }
    })
    const result = await db.customers.get(id)
    if (!result) return { ok: false, error: { code: 'CUSTOMER_NOT_FOUND', customerId: id } }
    return { ok: true, data: result }
  },

  async softDelete(id: CustomerId): Promise<void> {
    const now = nowISO()
    await db.customers.update(id, { deletedAt: now, updatedAt: now })
  },

  /** Seed demo customers on first run (only if DB is empty) */
  async seedIfEmpty(tenantId: TenantId): Promise<void> {
    const count = await db.customers.where('tenantId').equals(tenantId).count()
    if (count > 0) return

    const demos = [
      { nameKm: 'សុខ ដារ៉ា',   phone: '012 345 678' },
      { nameKm: 'ចាន់ ប៊ុនណា',  phone: '098 765 432' },
      { nameKm: 'លី សុភាព',    phone: null           },
      { nameKm: 'ហ៊ុន វណ្ណៈ',  phone: '011 222 333' },
      { nameKm: 'ម៉ៅ សុខលី',   phone: null           },
    ]
    for (const d of demos) {
      await customerService.create({ tenantId, ...d })
    }
  },
}
