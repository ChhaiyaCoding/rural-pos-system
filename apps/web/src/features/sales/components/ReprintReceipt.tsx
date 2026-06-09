'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useStoreProfile } from '@/store/storeProfile.store'
import { buildReceiptData } from '../buildReceipt'
import { SaleReceiptSheet } from './SaleReceiptSheet'
import type { Sale } from '@/types'

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

  if (items === undefined) return null // still loading items

  const data = buildReceiptData(sale, items, customer ?? null, cashierName)
  return <SaleReceiptSheet data={data} onClose={onClose} />
}
