import { db } from '@/db'
import { generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'
import type { CartItem, HeldInvoice } from '@/types'
import type { TenantId, KHR, UUID } from '@/types/branded'

export interface HoldInput {
  tenantId: TenantId
  label?:   string
  items:    CartItem[]
  total:    KHR
  count:    number
}

export const heldInvoiceService = {
  /** Save the current cart as a draft (multiple drafts supported — local only) */
  async hold(input: HoldInput): Promise<HeldInvoice> {
    const held: HeldInvoice = {
      id:        generateId(),
      tenantId:  input.tenantId,
      label:     input.label?.trim() ? input.label.trim() : null,
      items:     input.items,
      total:     input.total,
      count:     input.count,
      createdAt: nowISO(),
    }
    await db.heldInvoices.add(held)
    return held
  },

  async list(tenantId: TenantId): Promise<HeldInvoice[]> {
    return db.heldInvoices.where('tenantId').equals(tenantId).reverse().sortBy('createdAt')
  },

  async remove(id: UUID): Promise<void> {
    await db.heldInvoices.delete(id)
  },
}
