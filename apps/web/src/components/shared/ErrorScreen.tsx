'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, House } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Shown by the Next.js error boundaries instead of a blank white screen.
 *  A render error never touches IndexedDB, so the shop's data is safe. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warn-bg text-warn" aria-hidden="true">
        <AlertTriangle size={30} strokeWidth={2.25} />
      </span>
      <div className="max-w-sm">
        <h1 className="text-title font-bold text-text">មានបញ្ហាបន្តិច</h1>
        <p className="mt-2 text-body text-text-muted">
          ទិន្នន័យលក់ ស្តុក និងបំណុលរបស់អ្នកនៅដដែល មិនបាត់ទេ។ សូមចុច «សាកម្ដងទៀត»។
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2.5">
        <Button variant="dark" size="lg" fullWidth onClick={reset} icon={<RotateCcw size={20} strokeWidth={2.25} />}>
          សាកម្ដងទៀត
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => window.location.assign('/')}
          icon={<House size={20} strokeWidth={2.25} />}
        >
          ទៅទំព័រដើម
        </Button>
      </div>
    </div>
  )
}
