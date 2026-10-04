'use client'

import { RefreshCw, WifiOff, CloudUpload } from 'lucide-react'
import { useSyncStore } from '@/store/sync.store'
import { cx } from '@/components/ui/cx'

export function SyncStatusBar() {
  const { isOnline, isSyncing, pendingCount } = useSyncStore()

  if (isOnline && !isSyncing && pendingCount === 0) return null

  const offline = !isOnline
  const syncing = isOnline && isSyncing

  return (
    <div className="flex shrink-0 justify-center px-4 pt-2" role="status" aria-live="polite">
      <div
        className={cx(
          'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold',
          offline ? 'bg-warn-bg text-warn' : syncing ? 'bg-surface text-text-subtle' : 'bg-warn-bg text-warn',
        )}
      >
        {offline && <WifiOff size={14} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />}
        {syncing && <RefreshCw size={14} strokeWidth={2.5} className="shrink-0 animate-spin" aria-hidden="true" />}
        {!offline && !syncing && <CloudUpload size={14} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />}
        <span className="truncate">
          {offline && 'គ្មានអ៊ីនធឺណិត — ទិន្នន័យត្រូវបានរក្សាទុកក្នុងឧបករណ៍'}
          {syncing && 'កំពុង Sync...'}
          {!offline && !syncing && pendingCount > 0 && `${pendingCount} កំណត់ត្រាកំពុងរង់ចាំ Sync`}
        </span>
      </div>
    </div>
  )
}
