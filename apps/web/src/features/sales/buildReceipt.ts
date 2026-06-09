import type { Sale, SaleItem, Customer } from '@/types'
import type { KHR } from '@/types/branded'
import type { ReceiptData } from './components/SaleReceiptSheet'

/**
 * Reconstruct a printable ReceiptData from a stored Sale (+ its items / customer).
 * Used to reprint a past receipt from history. The order-level discount and
 * change are derived (they aren't stored on the Sale row):
 *   discount      = Σ line subtotals − totalAmount
 *   changeGiven   = paidAmount − totalAmount        (cash, when positive)
 *   debtRemaining = totalAmount − paidAmount        (debt / partial)
 */
export function buildReceiptData(
  sale: Sale,
  items: SaleItem[],
  customer: Customer | null,
  cashierName: string,
): ReceiptData {
  const itemsSubtotal = items.reduce((s, i) => s + (i.subtotal as number), 0)
  const discount  = Math.max(0, itemsSubtotal - (sale.totalAmount as number)) as KHR
  const isCash    = sale.paymentType === 'cash'
  const change    = Math.max(0, (sale.paidAmount as number) - (sale.totalAmount as number)) as KHR
  const remaining = Math.max(0, (sale.totalAmount as number) - (sale.paidAmount as number)) as KHR

  return {
    receiptNumber: sale.receiptNumber || String(sale.id).slice(0, 8).toUpperCase(),
    cashierName,
    items: items.map((i) => ({
      nameKm:    i.nameKm,
      qty:       i.qty,
      unitPrice: i.unitPrice,
      subtotal:  i.subtotal,
    })),
    discount,
    totalAmount:   sale.totalAmount,
    paymentType:   isCash ? 'cash' : 'debt',
    cashReceived:  sale.paidAmount,
    changeGiven:   isCash ? change : null,
    debtRemaining: isCash ? null : remaining,
    customerName:  customer?.nameKm ?? null,
    createdAt:     sale.createdAt,
  }
}
