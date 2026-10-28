/* Rural POS service worker — hand-written, no build step.
 *
 * Goal: the app opens and sells with no internet, after it has been opened
 * online once. The shop's data lives in IndexedDB; this file only caches the
 * app itself.
 *
 *  - Pages (navigations): network first with a short timeout, cached copy when
 *    offline or too slow. Online users always get the latest deploy, so no
 *    "update available" prompt is needed and an open shift is never
 *    interrupted.
 *  - /_next/static/*: cache first (file names are content-hashed, never change).
 *  - Icons, manifest: stale-while-revalidate.
 *  - After login the page sends {type:'WARM'}: every app route and the assets
 *    it references are fetched into the cache, so screens never opened before
 *    still work offline.
 *
 * Replaces the old next-pwa/workbox worker at the same URL; activate deletes
 * its caches. Bump VERSION only when this file's caching logic changes.
 */
const VERSION = 'v1'
const PAGES = `pos-pages-${VERSION}`
const ASSETS = `pos-assets-${VERSION}`
const ROUTES = [
  '/', '/sell', '/inventory', '/debt', '/customers', '/reports', '/receipts',
  '/expenses', '/more', '/settings', '/staff', '/suppliers', '/login',
]
const NETWORK_TIMEOUT_MS = 3500
const MAX_ASSETS = 400
const WARM_EVERY_MS = 10 * 60 * 1000

const OFFLINE_HTML = `<!doctype html><html lang="km"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>POS ហាង</title>
<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;
font-family:'Noto Sans Khmer',system-ui,sans-serif;background:#EEF1F5;color:#0F1B2D;text-align:center;padding:24px">
<div><p style="font-size:20px;font-weight:700;margin:0 0 8px">គ្មានអ៊ីនធឺណិត</p>
<p style="margin:0 0 20px;color:#5B6576">ទំព័រនេះមិនទាន់បានរក្សាទុកសម្រាប់ប្រើ offline ទេ។<br>សូមភ្ជាប់អ៊ីនធឺណិតម្ដង ហើយបើក app ឡើងវិញ។</p>
<button onclick="location.reload()" style="height:52px;padding:0 24px;border:0;border-radius:14px;background:#0F1B2D;color:#fff;font:inherit;font-weight:700">សាកម្ដងទៀត</button>
</div></body></html>`

self.addEventListener('install', () => {
  // Network-first pages make taking over immediately safe
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([PAGES, ASSETS])
    for (const name of await caches.keys()) {
      if (!keep.has(name)) await caches.delete(name)   // incl. old workbox caches
    }
    await self.clients.claim()
  })())
})

let lastWarm = 0
let warming = false
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WARM') return
  if (warming || Date.now() - lastWarm < WARM_EVERY_MS) return
  warming = true
  event.waitUntil(
    warm()
      // Only "done" once signed in (app routes cached), not on the login page
      .then((cached) => { if (cached > 1) lastWarm = Date.now() })
      .finally(() => { warming = false }),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(page(event, url))
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(immutable(req))
  } else if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(staleWhileRevalidate(event, req))
  }
  // Everything else (RSC payloads, data, dev tools) goes straight to the
  // network. Offline, Next.js falls back to a full navigation, served above.
})

/* ── Pages ───────────────────────────────────────────────── */
async function page(event, url) {
  const cache = await caches.open(PAGES)
  const key = url.pathname
  const network = fetch(event.request).then(async (res) => {
    // A redirect (e.g. to /login) or an error page is never cached
    if (res.ok && !res.redirected) await cache.put(key, res.clone())
    return res
  })
  event.waitUntil(network.catch(() => {}))

  try {
    return await withTimeout(network, NETWORK_TIMEOUT_MS)
  } catch {
    return (
      (await cache.match(key)) ??
      (await cache.match('/')) ??
      new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  }
}

/* ── Hashed build assets ─────────────────────────────────── */
async function immutable(req) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) {
    await cache.put(req, res.clone())
    trim(cache)
  }
  return res
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(req)
  const network = fetch(req).then(async (res) => {
    if (res.ok) await cache.put(req, res.clone())
    return res
  })
  event.waitUntil(network.catch(() => {}))
  return hit ?? network
}

/* ── Warm-up: every route + the assets its HTML references ── */
/** Returns how many routes were cached (1 = only /login: not signed in) */
async function warm() {
  let cached = 0
  const pages = await caches.open(PAGES)
  const assets = await caches.open(ASSETS)
  const wanted = new Set(['/manifest.json', '/icons/icon-192x192.png', '/icons/apple-touch-icon.png'])

  for (const route of ROUTES) {
    try {
      const res = await fetch(route, { credentials: 'same-origin', cache: 'no-store' })
      if (!res.ok || res.redirected) continue          // not signed in yet → skip
      const html = await res.clone().text()
      await pages.put(route, res)
      cached++
      for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) wanted.add(m[0])
    } catch { /* offline — try again next time */ }
  }

  for (const path of wanted) {
    try {
      if (await assets.match(path)) continue
      const res = await fetch(path)
      if (res.ok) await assets.put(path, res)
    } catch { /* ignore */ }
  }
  trim(assets)
  return cached
}

/* ── Helpers ─────────────────────────────────────────────── */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

/** Keep the asset cache bounded: drop the oldest entries beyond MAX_ASSETS */
async function trim(cache) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i])
}
