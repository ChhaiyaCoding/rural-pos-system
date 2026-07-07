'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useStoreProfile } from '@/store/storeProfile.store'
import { debtService } from '@/services/debt.service'
import { saleRemaining } from '@/features/debt/reconcile'
import { buildReceiptData } from '../buildReceipt'
import { SaleReceiptSheet } from './SaleReceiptSheet'
import type { Sale, DebtTransaction } from '@/types'
import type { TenantId, CustomerId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

/** Rebuild a stored sale into a printable receipt and show the receipt sheet. */
export function ReprintReceipt({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { cashierName } = useStoreProfile()

  const items = useLiveQuery(
    () => db.saleItems.where('saleId').equals(sale.id).toArray(),
    [sale.id]
  )
  const customer = useLiveQuery(
    async () => {
      if (!sale.customerId) return null
      return (await db.customers.get(sale.customerId)) ?? null
    },
    [sale.customerId]
  )

  /* Ledger + this customer's debt invoices → is THIS invoice now settled? */
  const txns = useLiveQuery(
    () => sale.customerId
      ? debtService.getLedger(DEMO_TENANT, sale.customerId as CustomerId)
      : Promise.resolve([] as DebtTransaction[]),
    [sale.customerId]
  )
  const debtSales = useLiveQuery(
    () => sale.customerId
      ? db.sales.where('tenantId').equals(DEMO_TENANT)
          .filter((s) => s.customerId === sale.customerId && !s.isVoid && (s.paymentType === 'debt' || s.paymentType === 'partial'))
          .toArray()
      : Promise.resolve([] as Sale[]),
    [sale.customerId]
  )

  if (items === undefined) return null // still loading items

  const debtSettled =
    sale.paymentType !== 'cash' &&
    txns !== undefined && debtSales !== undefined &&
    saleRemaining(String(sale.id), debtSales, txns) === 0

  const data = buildReceiptData(sale, items, customer ?? null, cashierName)
  return <SaleReceiptSheet data={data} onClose={onClose} debtSettled={debtSettled} />
}
