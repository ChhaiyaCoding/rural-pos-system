'use client'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getPending, markSynced, markError, pendingCount } from './queue'
import { useSyncStore } from '@/store/sync.store'
import { useAuthStore } from '@/store/auth.store'
import { nowISO } from '@/lib/date'

const MAX_RETRY = 3
const POLL_INTERVAL_MS = 30_000

let pollTimer: ReturnType<typeof setInterval> | null = null

export async function runSync(): Promise<void> {
  // MVP / demo mode: no backend configured — keep everything local, never
  // attempt to reach Supabase (it would throw and surface as a runtime error).
  if (!isSupabaseConfigured()) return

  const { tenantId } = useAuthStore.getState()
  if (!tenantId) return

  const { isOnline, isSyncing } = useSyncStore.getState()
  if (!isOnline || isSyncing) return

  const items = await getPending(tenantId)
  if (items.length === 0) return

  useSyncStore.getState().setSyncing(true)

  const supabase = createClient()

  for (const item of items) {
    if (item.retryCount >= MAX_RETRY) continue

    try {
      const payload = JSON.parse(item.payload) as Record<string, unknown>

      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        const { error } = await supabase
          .from(item.tableName as never)
          .upsert(payload as never)

        if (error) throw new Error(error.message)
      }

      if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(item.tableName as never)
          .update({ deleted_at: nowISO() } as never)
          .eq('id', item.recordId)

        if (error) throw new Error(error.message)
      }

      await markSynced(item.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await markError(item.id, message)
    }
  }

  const remaining = await pendingCount(tenantId)
  useSyncStore.getState().setPendingCount(remaining)
  useSyncStore.getState().setSyncing(false)
  useSyncStore.getState().setLastSynced(nowISO())
}

export function startSyncEngine(): () => void {
  const onOnline = () => {
    useSyncStore.getState().setOnline(true)
    void runSync()
  }

  const onOffline = () => {
    useSyncStore.getState().setOnline(false)
    if (pollTimer) clearInterval(pollTimer)
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  if (navigator.onLine) {
    pollTimer = setInterval(() => void runSync(), POLL_INTERVAL_MS)
  }

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    if (pollTimer) clearInterval(pollTimer)
  }
}
