import Dexie from 'dexie'
import { db } from './index'
import type { TenantId, CustomerId } from '@/types/branded'

/* Indexed sales reads (schema v7). Use these instead of
   `where('tenantId')…filter(…)`, which reads every sale ever made. */

/** A shop's sales from `fromISO` (inclusive) up to `toISO` (inclusive), oldest first */
export function salesBetween(tenantId: TenantId, fromISO: string, toISO?: string) {
  return db.sales
    .where('[tenantId+createdAt]')
    .between([tenantId, fromISO], [tenantId, toISO ?? Dexie.maxKey], true, true)
}

/** A shop's sales made before `iso` (exclusive) */
export function salesBefore(tenantId: TenantId, iso: string) {
  return db.sales
    .where('[tenantId+createdAt]')
    .between([tenantId, Dexie.minKey], [tenantId, iso], true, false)
}

/** All of a shop's sales, newest first */
export function newestSales(tenantId: TenantId) {
  return db.sales
    .where('[tenantId+createdAt]')
    .between([tenantId, Dexie.minKey], [tenantId, Dexie.maxKey])
    .reverse()
}

/** One customer's sales, oldest first */
export function salesOfCustomer(tenantId: TenantId, customerId: CustomerId) {
  return db.sales
    .where('[customerId+createdAt]')
    .between([customerId, Dexie.minKey], [customerId, Dexie.maxKey])
    .filter((s) => s.tenantId === tenantId)
}

/** When the customer last bought something (non-void), or undefined */
export async function lastPurchaseAt(tenantId: TenantId, customerId: CustomerId): Promise<string | undefined> {
  const last = await db.sales
    .where('[customerId+createdAt]')
    .between([customerId, Dexie.minKey], [customerId, Dexie.maxKey])
    .reverse()
    .filter((s) => s.tenantId === tenantId && !s.isVoid)
    .first()
  return last?.createdAt
}
