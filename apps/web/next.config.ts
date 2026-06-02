import type { NextConfig } from 'next'

// NOTE: @ducanh2912/next-pwa v10 causes webpack prerender errors with
// Next.js 15 App Router (module resolves to undefined during SSR).
// PWA is temporarily disabled until the plugin is updated or replaced.
// To re-enable: wrap nextConfig with withPWA() and add sw-related deps.

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
}

export default nextConfig
