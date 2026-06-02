import { db } from '@/db'
import type { SyncQueueItem } from '@/db/schema'
import { generateId } from '@/lib/uuid'
import { nowISO } from '@/lib/date'

export async function enqueue(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>
): Promise<void> {
  await db.syncQueue.add({
    ...item,
    id: generateId(),
    createdAt: nowISO(),
    retryCount: 0,
  })
}

export async function getPending(tenantId: string): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .where('tenantId')
    .equals(tenantId)
    .filter((item) => !item.syncedAt)
    .sortBy('createdAt')
}

export async function markSynced(id: string): Promise<void> {
  await db.syncQueue.update(id, { syncedAt: nowISO() })
}

export async function markError(id: string, error: string): Promise<void> {
  const item = await db.syncQueue.get(id)
  if (!item) return
  await db.syncQueue.update(id, {
    error,
    retryCount: item.retryCount + 1,
  })
}

export async function pendingCount(tenantId: string): Promise<number> {
  return db.syncQueue
    .where('tenantId')
    .equals(tenantId)
    .filter((item) => !item.syncedAt)
    .count()
}
