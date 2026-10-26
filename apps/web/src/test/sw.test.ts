/* Runs public/sw.js in a simulated service-worker scope (no browser needed):
   a Map-backed Cache Storage, a scripted network, and hand-made events. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { beforeEach, describe, expect, it } from 'vitest'

const ORIGIN = 'https://pos.test'
const SW_SOURCE = readFileSync(fileURLToPath(new URL('../../public/sw.js', import.meta.url)), 'utf8')

type Req = { url: string; method: string; mode?: string }
type Handler = (event: unknown) => void

const abs = (input: string | Req) => new URL(typeof input === 'string' ? input : input.url, ORIGIN).href

class MockCache {
  map = new Map<string, Response>()
  async match(req: string | Req) { return this.map.get(abs(req))?.clone() }
  async put(req: string | Req, res: Response) { this.map.set(abs(req), res) }
  async delete(req: string | Req) { return this.map.delete(abs(req)) }
  async keys() { return [...this.map.keys()].map((url) => ({ url })) }
}

let stores: Map<string, MockCache>
/** path → response factory; missing path = offline (fetch rejects) */
let network: Map<string, () => Response | Promise<Response>>
let listeners: Map<string, Handler[]>

const html = (body: string) => new Response(`<html>${body}</html>`, { headers: { 'Content-Type': 'text/html' } })
const redirectedTo = (body: string) => {
  const res = html(body)
  Object.defineProperty(res, 'redirected', { value: true })
  return res
}

function boot() {
  stores = new Map()
  network = new Map()
  listeners = new Map()
  const caches = {
    open: async (name: string) => stores.get(name) ?? stores.set(name, new MockCache()).get(name)!,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  }
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Handler) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  }
  const fetch = async (input: string | Req) => {
    const make = network.get(new URL(abs(input)).pathname)
    if (!make) throw new TypeError('Failed to fetch')
    return make()
  }
  vm.runInNewContext(SW_SOURCE, { self, caches, fetch, Response, URL, setTimeout, clearTimeout, console })
}

/** Dispatch an event; resolves with what respondWith got and after all waitUntil work */
async function dispatch(type: string, init: Record<string, unknown>) {
  const pending: Promise<unknown>[] = []
  let response: Promise<Response> | undefined
  const event = {
    ...init,
    respondWith: (p: Promise<Response>) => { response = p },
    waitUntil: (p: Promise<unknown>) => { pending.push(p) },
  }
  for (const fn of listeners.get(type) ?? []) fn(event)
  const res = response ? await response : undefined
  await Promise.allSettled(pending)
  return res
}

const navigate = (path: string) =>
  dispatch('fetch', { request: { url: ORIGIN + path, method: 'GET', mode: 'navigate' } })
const get = (path: string) => dispatch('fetch', { request: { url: ORIGIN + path, method: 'GET', mode: 'cors' } })
const pageCache = () => [...stores.entries()].find(([n]) => n.startsWith('pos-pages'))?.[1]
const assetCache = () => [...stores.entries()].find(([n]) => n.startsWith('pos-assets'))?.[1]

beforeEach(boot)

describe('service worker', () => {
  it('activate deletes the old next-pwa / workbox caches', async () => {
    stores.set('workbox-precache-v2-https://pos.test/', new MockCache())
    stores.set('pos-pages-v1', new MockCache())
    await dispatch('activate', {})
    expect([...stores.keys()]).toEqual(['pos-pages-v1'])
  })

  it('online: serves the network page and keeps a copy', async () => {
    network.set('/sell', () => html('sell v2'))
    const res = await navigate('/sell')
    expect(await res!.text()).toContain('sell v2')
    expect(pageCache()?.map.has(`${ORIGIN}/sell`)).toBe(true)
  })

  it('offline: serves the cached page, then the home page, then a Khmer offline screen', async () => {
    network.set('/sell', () => html('sell cached'))
    network.set('/', () => html('home cached'))
    await navigate('/sell')
    await navigate('/')
    network.clear()   // internet gone

    expect(await (await navigate('/sell'))!.text()).toContain('sell cached')
    expect(await (await navigate('/reports'))!.text()).toContain('home cached')

    boot()            // fresh install, nothing cached
    const res = await navigate('/sell')
    expect(res!.headers.get('Content-Type')).toContain('text/html')
    expect(await res!.text()).toContain('គ្មានអ៊ីនធឺណិត')
  })

  it('slow network: falls back to the cached page after the timeout', async () => {
    network.set('/', () => html('home cached'))
    await navigate('/')
    network.set('/', () => new Promise((r) => setTimeout(() => r(html('home late')), 5000)))
    const started = Date.now()
    const res = await dispatch('fetch', { request: { url: `${ORIGIN}/`, method: 'GET', mode: 'navigate' } })
      .catch(() => undefined)
    expect(await res!.text()).toContain('home cached')
    expect(Date.now() - started).toBeLessThan(5500)
  }, 10_000)

  it('never caches a redirect (e.g. to /login when signed out)', async () => {
    network.set('/sell', () => redirectedTo('login page'))
    await navigate('/sell')
    expect(pageCache()?.map.has(`${ORIGIN}/sell`)).toBe(false)
  })

  it('build assets are cache-first and keep working offline', async () => {
    network.set('/_next/static/chunks/app-abc.js', () => new Response('code'))
    await get('/_next/static/chunks/app-abc.js')
    network.clear()
    expect(await (await get('/_next/static/chunks/app-abc.js'))!.text()).toBe('code')
  })

  it('WARM caches every signed-in route plus the assets its HTML references', async () => {
    for (const route of ['/', '/sell', '/inventory', '/debt', '/customers', '/reports', '/receipts',
      '/expenses', '/more', '/settings', '/staff', '/suppliers', '/login']) {
      network.set(route, () => html(`<script src="/_next/static/chunks${route === '/' ? '/home' : route}-1.js"></script>`))
    }
    network.set('/staff', () => redirectedTo('login'))   // e.g. a page that redirects
    for (const p of ['/manifest.json', '/icons/icon-192x192.png', '/icons/apple-touch-icon.png']) network.set(p, () => new Response('x'))
    for (const r of ['home', 'sell', 'inventory', 'debt', 'customers', 'reports', 'receipts', 'expenses', 'more', 'settings', 'suppliers', 'login']) {
      network.set(`/_next/static/chunks/${r}-1.js`, () => new Response('js'))
    }

    await dispatch('message', { data: { type: 'WARM' } })

    const pages = [...pageCache()!.map.keys()].map((u) => new URL(u).pathname).sort()
    expect(pages).toEqual(['/', '/customers', '/debt', '/expenses', '/inventory', '/login', '/more',
      '/receipts', '/reports', '/sell', '/settings', '/suppliers'])
    expect(assetCache()!.map.has(`${ORIGIN}/_next/static/chunks/sell-1.js`)).toBe(true)
    expect(assetCache()!.map.has(`${ORIGIN}/icons/apple-touch-icon.png`)).toBe(true)

    // …so a screen never opened before still opens offline
    network.clear()
    expect(await (await navigate('/expenses'))!.text()).toContain('expenses-1.js')
  })

  it('WARM on the login page (signed out) does not stop a later warm-up', async () => {
    network.set('/login', () => html('login'))   // every other route → offline/redirect
    await dispatch('message', { data: { type: 'WARM' } })
    network.set('/sell', () => html('sell'))
    await dispatch('message', { data: { type: 'WARM' } })
    expect(pageCache()!.map.has(`${ORIGIN}/sell`)).toBe(true)
  })
})
