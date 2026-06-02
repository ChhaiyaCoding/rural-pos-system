import { create } from 'zustand'

interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
  pendingCount: number
  error: string | null
}

interface SyncActions {
  setOnline: (value: boolean) => void
  setSyncing: (value: boolean) => void
  setLastSynced: (iso: string) => void
  setPendingCount: (count: number) => void
  setSyncError: (error: string | null) => void
}

export const useSyncStore = create<SyncState & SyncActions>()((set) => ({
  isOnline: true, // always true on first render (server + client hydration match); NetworkWatcher updates it on mount
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  error: null,

  setOnline: (value) => set({ isOnline: value }),
  setSyncing: (value) => set({ isSyncing: value }),
  setLastSynced: (iso) => set({ lastSyncedAt: iso, error: null }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncError: (error) => set({ error }),
}))
