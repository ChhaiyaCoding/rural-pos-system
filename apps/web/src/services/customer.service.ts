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
      dueDate: null,
      dueDateOriginal: null,
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

  /** Set / change / clear the repayment due date ('YYYY-MM-DD' or null).
   *  Records the first date set as `dueDateOriginal` so we can show how many
   *  days a repayment has since been postponed. */
  async setDueDate(id: CustomerId, dueDate: string | null): Promise<Result<Customer>> {
    const now = nowISO()
    await db.transaction('rw', [db.customers, db.syncQueue], async () => {
      const existing = await db.customers.get(id)
      const patch: Partial<Customer> = { dueDate, updatedAt: now }
      if (dueDate) {
        // First time a due date is assigned → that's the baseline
        if (!existing?.dueDateOriginal) patch.dueDateOriginal = dueDate
      } else {
        // Clearing the due date resets the postpone baseline too
        patch.dueDateOriginal = null
      }
      await db.customers.update(id, patch)
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

  /** Seed demo customers on first run (only if DB is empty).
   *  Uses fixed IDs + bulkPut so it stays idempotent even when called
   *  twice concurrently (React StrictMode double-invokes effects in dev) —
   *  random-UUID inserts would otherwise create duplicate customers. */
  async seedIfEmpty(tenantId: TenantId): Promise<void> {
    const count = await db.customers.where('tenantId').equals(tenantId).count()
    if (count > 0) return

    const now = nowISO()
    const demos: Array<{ id: string; nameKm: string; phone?: string }> = [
      { id: 'cust-demo-1', nameKm: 'សុខ ដារ៉ា',   phone: '012 345 678' },
      { id: 'cust-demo-2', nameKm: 'ចាន់ ប៊ុនណា',  phone: '098 765 432' },
      { id: 'cust-demo-3', nameKm: 'លី សុភាព'                           },
      { id: 'cust-demo-4', nameKm: 'ហ៊ុន វណ្ណៈ',  phone: '011 222 333' },
      { id: 'cust-demo-5', nameKm: 'ម៉ៅ សុខលី'                          },
    ]
    const seeded: Customer[] = demos.map((d) => ({
      id: d.id as CustomerId,
      tenantId,
      nameKm: d.nameKm,
      phone: d.phone ?? null,
      address: null,
      imageUri: null,
      debtBalance: toKHR(0),
      dueDate: null,
      dueDateOriginal: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncedAt: null,
    }))
    await db.customers.bulkPut(seeded)
  },
}
