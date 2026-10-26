import type { NextConfig } from 'next'
import path from 'path'

// NOTE: PWA is disabled. @ducanh2912/next-pwa (v10) broke prerendering with the
// App Router and was removed; the service worker will be rebuilt (WP7).

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  // Pin the file-tracing root to this app so Next.js doesn't get confused by
  // the monorepo's pnpm-lock.yaml at the repo root (silences the dev "1 Issue"
  // multiple-lockfiles warning).
  outputFileTracingRoot: path.join(__dirname),
  // The app never uses next/image (photos are data URIs), so turn the
  // /_next/image optimizer endpoint off — it is the attack surface of the
  // Next.js/sharp image advisories.
  images: { unoptimized: true },
}

export default nextConfig
