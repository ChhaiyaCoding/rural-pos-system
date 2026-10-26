'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { startSyncEngine } from '@/sync/engine'
import { useSyncStore } from '@/store/sync.store'
import { useStoreProfile } from '@/store/storeProfile.store'
import { setExchangeRate } from '@/lib/money'

/** Best effort: Chrome/Android grants it silently (more readily once installed),
 *  Safari decides on its own; unsupported browsers just skip it. */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return
    if (await navigator.storage.persisted()) return
    await navigator.storage.persist()
  } catch { /* not available — nothing to do */ }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const setOnline = useSyncStore((s) => s.setOnline)
  const exchangeRate = useStoreProfile((s) => s.exchangeRate)

  /* Keep the pure money lib in sync with the user's configured rate */
  useEffect(() => {
    setExchangeRate(exchangeRate)
  }, [exchangeRate])

  useEffect(() => {
    // Sync real network state after hydration — store defaults to true on server
    setOnline(navigator.onLine)
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [setOnline])

  useEffect(() => {
    const stop = startSyncEngine()
    return stop
  }, [])

  /* Offline app shell (public/sw.js). Production only — in dev it would cache
     hot-reloaded code. WARM pre-caches every screen once the user is in. */
  const pathname = usePathname()
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => { /* no offline support — the app still works online */ })
  }, [])
  // On every screen change (the SW throttles it), e.g. right after login
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: 'WARM' })).catch(() => {})
  }, [pathname])

    /* Ask the browser to keep IndexedDB (sales, stock, debt) instead of evicting
     it under storage pressure — this device holds the shop's only copy. */
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  return <>{children}</>
}
