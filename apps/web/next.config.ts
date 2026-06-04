import type { NextConfig } from 'next'
import path from 'path'

// NOTE: @ducanh2912/next-pwa v10 causes webpack prerender errors with
// Next.js 15 App Router (module resolves to undefined during SSR).
// PWA is temporarily disabled until the plugin is updated or replaced.
// To re-enable: wrap nextConfig with withPWA() and add sw-related deps.

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  // Pin the file-tracing root to this app so Next.js doesn't get confused by
  // the monorepo's pnpm-lock.yaml at the repo root (silences the dev "1 Issue"
  // multiple-lockfiles warning).
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
