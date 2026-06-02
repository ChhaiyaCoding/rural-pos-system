// Shared types between apps/web and any future native client.
// Keep this file free of framework-specific imports (no React, no Next.js).

export type SubscriptionTier = 'free' | 'basic' | 'pro'
export type UserRole         = 'owner' | 'cashier'
export type PaymentType      = 'cash' | 'debt' | 'partial'
export type DebtTxnType      = 'charge' | 'payment'
export type SyncOperation    = 'INSERT' | 'UPDATE' | 'DELETE'
