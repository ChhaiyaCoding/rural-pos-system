import { db } from '@/db'
import type { CartItem, Customer, Product } from '@/types'
import type { CustomerId, KHR, ProductId, TenantId, UserId } from '@/types/branded'

export const TENANT  = 'tenant-test' as TenantId
export const CASHIER = 'cashier-test' as UserId
export const khr = (n: number) => n as KHR

/** Empty every table so each test starts from a clean device */
export async function resetDb(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()))
}

export async function addProduct(over: Partial<Product> = {}): Promise<Product> {
  const now = new Date().toISOString()
  const p: Product = {
    id: `prod-${Math.random().toString(36).slice(2, 8)}` as ProductId,
    tenantId: TENANT,
    nameKm: 'ទំនិញ',
    barcode: null,
    unit: 'ដប',
    costPrice: khr(800),
    sellPrice: khr(1000),
    stockQty: 10,
    lowStockThreshold: 2,
    categoryId: 'food',
    emoji: '📦',
    imageUri: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncedAt: null,
    ...over,
  }
  await db.products.add(p)
  return p
}

export async function addCustomer(over: Partial<Customer> = {}): Promise<Customer> {
  const now = new Date().toISOString()
  const c: Customer = {
    id: `cust-${Math.random().toString(36).slice(2, 8)}` as CustomerId,
    tenantId: TENANT,
    nameKm: 'អតិថិជន',
    phone: null,
    address: null,
    note: null,
    imageUri: null,
    debtBalance: khr(0),
    dueDate: null,
    dueDateOriginal: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncedAt: null,
    ...over,
  }
  await db.customers.add(c)
  return c
}

export function line(product: Product, qty: number, lineDiscount?: number): CartItem {
  return {
    product,
    qty,
    unitPrice: product.sellPrice,
    ...(lineDiscount != null ? { lineDiscount: khr(lineDiscount) } : {}),
  }
}

/** Ledger invariant: balance === Σ non-void charges − Σ non-void payments */
export async function ledgerBalance(customerId: CustomerId): Promise<number> {
  const txns = await db.debtTransactions.where('customerId').equals(customerId).toArray()
  return txns
    .filter((t) => !t.isVoid)
    .reduce((sum, t) => sum + (t.type === 'charge' ? t.amount : -t.amount), 0)
}
