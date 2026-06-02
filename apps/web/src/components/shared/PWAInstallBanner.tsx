'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'

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
    <div className="fixed bottom-[70px] inset-x-0 z-50 px-3 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm mx-auto bg-white rounded-2xl shadow-pop border border-slate-200 overflow-hidden animate-sheet-up">

        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-400" />

        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3">

            {/* App icon */}
            <div className="shrink-0 w-11 h-11 rounded-xl bg-primary-600 text-white text-[18px] font-bold flex items-center justify-center shadow-sm">
              ហ
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-slate-900 leading-tight">
                ដំឡើង POS ហាង
              </p>

              {platform === 'android' && (
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                  ដំឡើងលើ Home Screen — ប្រើដូច App ពិតៗ, offline បាន
                </p>
              )}

              {platform === 'ios' && (
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                  ចុច{' '}
                  <Share size={11} className="inline-block align-middle mx-0.5 text-primary-600" strokeWidth={2.5} />
                  {' '}Share → <span className="font-semibold text-slate-700">Add to Home Screen</span>
                </p>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={dismiss}
              className="min-h-0 min-w-0 shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 active:bg-slate-200 transition-colors"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Android install button */}
          {platform === 'android' && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="mt-3 w-full h-10 rounded-xl bg-primary-600 text-white font-bold text-[13px] flex items-center justify-center gap-2 active:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              <Download size={15} strokeWidth={2.5} />
              {installing ? 'កំពុងដំឡើង…' : 'ដំឡើងឥឡូវ'}
            </button>
          )}

          {/* iOS step-by-step */}
          {platform === 'ios' && (
            <div className="mt-3 flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-2.5">
              <Share size={14} className="text-primary-600 shrink-0" strokeWidth={2.5} />
              <p className="text-[11px] text-primary-700 font-semibold leading-snug">
                Safari → ចុច Share ក្រោម → "Add to Home Screen" → Add
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
