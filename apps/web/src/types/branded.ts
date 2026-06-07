type Brand<T, B extends string> = T & { readonly __brand: B }

export type UUID       = Brand<string, 'UUID'>
export type KHR        = Brand<number, 'KHR'>        // Riel — always integer, never float
export type TenantId   = Brand<UUID,   'TenantId'>
export type ProductId  = Brand<UUID,   'ProductId'>
export type CustomerId = Brand<UUID,   'CustomerId'>
export type SaleId     = Brand<UUID,   'SaleId'>
export type UserId     = Brand<UUID,   'UserId'>
export type ExpenseId  = Brand<UUID,   'ExpenseId'>
