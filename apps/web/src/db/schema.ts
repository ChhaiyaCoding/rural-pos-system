import Dexie, { type Table } from 'dexie'
import type {
  Product,
  Customer,
  Sale,
  SaleItem,
  DebtTransaction,
  CashDrawer,
  StockMovement,
  Expense,
  HeldInvoice,
} from '@/types'

export interface SyncQueueItem {
  id: string
  tenantId: string
  tableName: string
  recordId: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: string   // JSON-serialised record
  createdAt: string
  syncedAt?: string
  retryCount: number
  error?: string
}

export class PosDatabase extends Dexie {
  products!:         Table<Product>
  customers!:        Table<Customer>
  sales!:            Table<Sale>
  saleItems!:        Table<SaleItem>
  debtTransactions!: Table<DebtTransaction>
  cashDrawers!:      Table<CashDrawer>
  stockMovements!:   Table<StockMovement>
  expenses!:         Table<Expense>
  heldInvoices!:     Table<HeldInvoice>
  syncQueue!:        Table<SyncQueueItem>

  constructor() {
    super('pos-db')

    this.version(1).stores({
      products:         'id, tenantId, barcode, deletedAt',
      customers:        'id, tenantId, deletedAt',
      sales:            'id, tenantId, createdAt, isVoid',
      saleItems:        'id, saleId, tenantId, productId',
      debtTransactions: 'id, tenantId, customerId, createdAt, isVoid',
      syncQueue:        'id, tenantId, createdAt, syncedAt, retryCount',
    })

    this.version(2).stores({
      products: 'id, tenantId, barcode, categoryId, deletedAt',
    })

    this.version(3).stores({
      cashDrawers: 'id, tenantId, openedAt, closedAt',
    })

    this.version(4).stores({
      stockMovements: 'id, tenantId, productId, createdAt, type',
    })

    this.version(5).stores({
      expenses: 'id, tenantId, spentAt, categoryId, deletedAt',
    })

    this.version(6).stores({
      heldInvoices: 'id, tenantId, createdAt',
    })
  }
}
