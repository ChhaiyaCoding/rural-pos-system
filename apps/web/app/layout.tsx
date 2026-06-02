import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Khmer } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const notoSansKhmer = Noto_Sans_Khmer({
  subsets: ['khmer'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-khmer',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'POS ហាង',
  description: 'ប្រព័ន្ធគ្រប់គ្រងការលក់ សម្រាប់ហាងខ្នាតតូច',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS ហាង',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" className={notoSansKhmer.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
