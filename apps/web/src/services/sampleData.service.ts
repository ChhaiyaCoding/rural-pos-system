import { productService } from './product.service'
import { customerService } from './customer.service'
import type { TenantId } from '@/types/branded'

/** Sample products + customers for trying the app. Only ever loaded when the
 *  user asks for it (never automatically), and only into empty tables. */
export const sampleDataService = {
  async load(tenantId: TenantId): Promise<void> {
    await productService.seedIfEmpty(tenantId)
    await customerService.seedIfEmpty(tenantId)
  },
}
