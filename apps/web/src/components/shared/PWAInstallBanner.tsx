'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { firstGrapheme } from '@/components/ui/text'
import { useStoreProfile } from '@/store/storeProfile.store'

type Platform = 'android' | 'ios' | null

const DISMISSED_KEY = 'pwa-install-dismissed'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  const isIOS = /ipad|iphone|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)
  if (isIOS) return 'ios'
  if (isAndroid) return 'android'
  return null
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

export function PWAInstallBanner() {
  const [show,          setShow]          = useState(false)
  const [platform,      setPlatform]      = useState<Platform>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installing,    setInstalling]    = useState(false)
  const { storeName } = useStoreProfile()

  useEffect(() => {
    // Already installed as PWA — never show
    if (isStandalone()) return

    // User already dismissed — don't show again
    if (localStorage.getItem(DISMISSED_KEY)) return

    const plt = detectPlatform()
    setPlatform(plt)

    if (plt === 'android') {
      // Android: wait for browser install prompt event
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        // Show banner after short delay so app feels loaded first
        setTimeout(() => setShow(true), 3000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    if (plt === 'ios') {
      // iOS: no native prompt — show manual instructions after delay
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      dismiss()
    } else {
      setInstalling(false)
    }
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(112px+env(safe-area-inset-bottom))] z-40 px-3 md:inset-x-auto md:bottom-6 md:left-[120px] md:px-0">
      <div role="dialog" aria-label="ដំឡើង POS ហាង" className="pointer-events-auto mx-auto w-full max-w-sm rounded-xl bg-surface p-4 shadow-float animate-sheet-up">
        <div className="flex items-start gap-3">

          {/* App tile */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-title-sm font-bold text-ink-900" aria-hidden="true">
            {firstGrapheme(storeName || 'ហ')}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 self-center">
            <p className="text-body font-bold text-text">ដំឡើង POS ហាង</p>

            {platform === 'android' && (
              <p className="mt-0.5 text-meta text-text-muted">
                ដំឡើងលើ Home Screen — ប្រើដូច App ពិតៗ, offline បាន
              </p>
            )}

            {platform === 'ios' && (
              <p className="mt-0.5 text-meta text-text-muted">
                ចុច{' '}
                <Share size={13} className="mx-0.5 inline-block align-middle text-text" strokeWidth={2.5} aria-hidden="true" />
                {' '}Share → <span className="font-semibold text-text">Add to Home Screen</span>
              </p>
            )}
          </div>

          {/* Close */}
          <IconButton aria-label="បិទ" variant="soft" onClick={dismiss} className="-mr-1 -mt-1">
            <X size={18} strokeWidth={2.5} />
          </IconButton>
        </div>

        {/* Android install button */}
        {platform === 'android' && (
          <Button
            variant="primary"
            fullWidth
            className="mt-3"
            onClick={handleInstall}
            disabled={installing}
            icon={<Download size={18} strokeWidth={2.5} />}
          >
            {installing ? 'កំពុងដំឡើង…' : 'ដំឡើងឥឡូវ'}
          </Button>
        )}

        {/* iOS step-by-step */}
        {platform === 'ios' && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2.5">
            <Share size={16} className="shrink-0 text-text" strokeWidth={2.5} aria-hidden="true" />
            <p className="text-meta font-semibold text-text-subtle">
              Safari → ចុច Share ក្រោម → &quot;Add to Home Screen&quot; → Add
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
