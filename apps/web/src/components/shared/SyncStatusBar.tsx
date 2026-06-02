'use client'

import { useSyncStore } from '@/store/sync.store'

export function SyncStatusBar() {
  const { isOnline, isSyncing, pendingCount } = useSyncStore()

  if (isOnline && !isSyncing && pendingCount === 0) return null

  return (
    <div
      className={[
        'px-4 py-1.5 text-xs text-center font-medium',
        !isOnline
          ? 'bg-warning-50 text-warning-500'
          : isSyncing
          ? 'bg-primary-50 text-primary-600'
          : 'bg-warning-50 text-warning-500',
      ].join(' ')}
    >
      {!isOnline && 'គ្មានអ៊ីនធឺណិត — ទិន្នន័យត្រូវបានរក្សាទុកក្នុងឧបករណ៍'}
      {isOnline && isSyncing && 'កំពុង Sync...'}
      {isOnline && !isSyncing && pendingCount > 0 &&
        `${pendingCount} កំណត់ត្រាកំពុងរង់ចាំ Sync`}
    </div>
  )
}
