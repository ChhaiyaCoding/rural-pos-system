export type { UUID, KHR, TenantId, ProductId, CustomerId, SaleId, UserId } from './branded'
export type { AppError, Result } from './errors'

// ─── Domain models ────────────────────────────────────────────────────────────

import type { UUID, KHR, TenantId, ProductId, CustomerId, SaleId, UserId } from './branded'

export interface Product {
  id: ProductId
  tenantId: TenantId
  nameKm: string
  nameEn?: string        // optional English / Latin name for search
  barcode: string | null
  unit: string
  costPrice: KHR
  sellPrice: KHR
  stockQty: number
  lowStockThreshold: number
  categoryId: string
  emoji: string
  imageUri: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  syncedAt: string | null
}

export interface Customer {
  id: CustomerId
  tenantId: TenantId
  nameKm: string
  phone: string | null
  address: string | null
  imageUri: string | null
  debtBalance: KHR
  /** Date the customer should repay by — 'YYYY-MM-DD', null if none set */
  dueDate: string | null
  /** First due date ever set — baseline for "postponed X days" tracking */
  dueDateOriginal: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  syncedAt: string | null
}

export interface Sale {
  id: SaleId
  tenantId: TenantId
  cashierId: UserId
  totalAmount: KHR
  paidAmount: KHR
  paymentType: 'cash' | 'debt' | 'partial'
  customerId: CustomerId | null
  note: string | null
  isVoid: boolean
  createdAt: string
  syncedAt: string | null
}

export interface SaleItem {
  id: UUID
  saleId: SaleId
  tenantId: TenantId
  productId: ProductId
  nameKm: string       // snapshot at time of sale
  qty: number
  unitPrice: KHR
  subtotal: KHR
}

export interface DebtTransaction {
  id: UUID
  tenantId: TenantId
  customerId: CustomerId
  saleId: SaleId | null
  amount: KHR
  type: 'charge' | 'payment'
  note: string | null
  isVoid: boolean
  createdAt: string
  syncedAt: string | null
}

export interface CartItem {
  product: Product
  qty: number
  unitPrice: KHR
  lineDiscount?: KHR   // បញ្ចុះតម្លៃក្នុងមួយ line (KHR off the line subtotal)
}

export type StockMovementType = 'sale' | 'restock' | 'void_return' | 'adjustment'

export interface StockMovement {
  id:          UUID
  tenantId:    TenantId
  productId:   ProductId
  productName: string
  type:        StockMovementType
  delta:       number       // + បន្ថែម / − ដក
  qtyBefore:   number
  qtyAfter:    number
  note:        string | null
  saleId:      SaleId | null
  createdAt:   string
}

export interface CashDrawer {
  id: UUID
  tenantId: TenantId
  cashierId: UserId
  cashierName: string
  openingBalance: KHR        // ប្រាក់ក្នុងហ្គូពេលបើក
  closingBalance: KHR | null // ប្រាក់ដែលបានរាប់ពេលបិទ
  cashSalesTotal: KHR | null // ចំណូល cash ក្នុងវេននេះ
  expectedBalance: KHR | null // opening + cashSales
  difference: KHR | null      // closing - expected
  openedAt: string
  closedAt: string | null
  note: string | null
}
