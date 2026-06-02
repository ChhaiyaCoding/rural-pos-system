import type { ProductId, CustomerId, SaleId } from './branded'

export type AppError =
  | { code: 'PRODUCT_NOT_FOUND';      productId: ProductId }
  | { code: 'CUSTOMER_NOT_FOUND';     customerId: CustomerId }
  | { code: 'SALE_NOT_FOUND';         saleId: SaleId }
  | { code: 'SALE_ALREADY_VOID';      saleId: SaleId }
  | { code: 'INSUFFICIENT_STOCK';     available: number; requested: number }
  | { code: 'INVALID_PAYMENT';        reason: string }
  | { code: 'DEBT_NOT_FOUND';         debtId: string }
  | { code: 'SYNC_FAILED';            reason: string }
  | { code: 'AUTH_REQUIRED' }
  | { code: 'UNKNOWN';                message: string }

export type Result<T> =
  | { ok: true;  data: T }
  | { ok: false; error: AppError }
