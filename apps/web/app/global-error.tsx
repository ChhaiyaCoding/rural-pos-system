'use client'

import { ErrorScreen } from '@/components/shared/ErrorScreen'
import './globals.css'

// Last resort: replaces the root layout when it (or Providers) throws.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="km">
      <body>
        <ErrorScreen error={error} reset={reset} />
      </body>
    </html>
  )
}
