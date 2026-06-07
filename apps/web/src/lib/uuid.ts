import { v4 as uuidv4 } from 'uuid'
import type { UUID, ProductId, CustomerId, SaleId, TenantId, ExpenseId } from '@/types/branded'

export const generateId   = (): UUID       => uuidv4() as UUID
export const generateProductId  = (): ProductId  => uuidv4() as ProductId
export const generateCustomerId = (): CustomerId => uuidv4() as CustomerId
export const generateSaleId     = (): SaleId     => uuidv4() as SaleId
export const generateTenantId   = (): TenantId   => uuidv4() as TenantId
export const generateExpenseId  = (): ExpenseId  => uuidv4() as ExpenseId
