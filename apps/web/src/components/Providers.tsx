'use client'

import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { startSyncEngine } from '@/sync/engine'
import { useSyncStore } from '@/store/sync.store'
import { useStoreProfile } from '@/store/storeProfile.store'
import { setExchangeRate } from '@/lib/money'
import kmMessages from '@/i18n/km.json'

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

  return (
    <NextIntlClientProvider locale="km" messages={kmMessages}>
      {children}
    </NextIntlClientProvider>
  )
}
