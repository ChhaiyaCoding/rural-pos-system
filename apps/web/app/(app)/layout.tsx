'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import {
  House,
  LayoutGrid,
  Package,
  NotebookText,
  ChartColumn,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { getDueInfo } from '@/lib/dueDate'
import { todayISODate } from '@/lib/date'
import { SyncStatusBar } from '@/components/shared/SyncStatusBar'
import { PWAInstallBanner } from '@/components/shared/PWAInstallBanner'
import { Pill } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import { firstGrapheme } from '@/components/ui/text'
import { useStoreProfile } from '@/store/storeProfile.store'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

/* ── Notification helpers ────────────────────────────────────────── */

/** Request notification permission once — silently if already decided */
async function requestNotifPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

/** Show a browser notification (requires permission granted) */
function showNotif(title: string, body: string, tag = 'pos', icon = '/icons/icon-192x192.png') {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon, badge: icon, tag })
}

type BadgeKey = 'stock' | 'debt'

interface NavItem {
  href:   string
  icon:   LucideIcon
  label:  string
  /** Extra route prefixes that keep this item highlighted */
  also?:  string[]
  badge?: BadgeKey
}

/* Phone floating tab bar — លក់ is the raised center slot */
const TABS_LEFT: NavItem[] = [
  { href: '/',          icon: House,   label: 'ទំព័រដើម' },
  { href: '/inventory', icon: Package, label: 'ស្តុក', also: ['/suppliers'], badge: 'stock' },
]
const TAB_SELL: NavItem = { href: '/sell', icon: LayoutGrid, label: 'លក់' }
const TABS_RIGHT: NavItem[] = [
  { href: '/debt', icon: NotebookText, label: 'បំណុល',    also: ['/customers'], badge: 'debt' },
  { href: '/more', icon: Ellipsis,     label: 'ច្រើនទៀត', also: ['/reports', '/receipts', '/expenses', '/settings', '/staff'] },
]

/* iPad left rail — six items, Reports has its own slot */
const RAIL: NavItem[] = [
  { href: '/',          icon: House,        label: 'ទំព័រដើម' },
  { href: '/sell',      icon: LayoutGrid,   label: 'លក់' },
  { href: '/inventory', icon: Package,      label: 'ស្តុក',     also: ['/suppliers'], badge: 'stock' },
  { href: '/debt',      icon: NotebookText, label: 'បំណុល',     also: ['/customers'], badge: 'debt' },
  { href: '/reports',   icon: ChartColumn,  label: 'របាយការណ៍', also: ['/receipts'] },
  { href: '/more',      icon: Ellipsis,     label: 'ច្រើនទៀត',  also: ['/expenses', '/settings', '/staff'] },
]

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/'
  return [item.href, ...(item.also ?? [])].some((p) => pathname.startsWith(p))
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  /* ── Notification permission (once on mount) ─────────────────── */
  useEffect(() => { requestNotifPermission() }, [])

  /* ── Alert counts (reactive) ────────────────────────────────── */

  /** Products where stock ≤ threshold (includes 0 = out-of-stock) */
  const stockAlertCount = useLiveQuery(
    () => db.products
      .where('tenantId').equals(DEMO_TENANT)
      .filter(p => !p.deletedAt && p.stockQty <= p.lowStockThreshold)
      .count(),
    []
  ) ?? 0

  /* ── Low-stock notification (useEffect — proper side-effect) ── */
  const mountedRef     = useRef(false)
  const notifiedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Skip on first mount — only notify when count changes after load
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (stockAlertCount === 0) return

    // Fetch product details for newly-low items
    db.products
      .where('tenantId').equals(DEMO_TENANT)
      .filter(p => !p.deletedAt && p.stockQty <= p.lowStockThreshold)
      .toArray()
      .then(lowProducts => {
        const newlyLow = lowProducts.filter(p => !notifiedIdsRef.current.has(p.id))
        if (newlyLow.length === 0) return
        newlyLow.forEach(p => notifiedIdsRef.current.add(p.id))

        if (newlyLow.length === 1) {
          const p = newlyLow[0]!
          const isOut = p.stockQty === 0
          showNotif(
            isOut ? '⚠️ អស់ស្តុក!' : '⚠️ ស្តុកតិច!',
            isOut
              ? `${p.nameKm} — អស់ស្តុក`
              : `${p.nameKm} — នៅ ${p.stockQty} ${p.unit} (ដល់កំណត់ ${p.lowStockThreshold})`
          )
        } else {
          showNotif(
            '⚠️ ស្តុកទាប!',
            `ទំនិញ ${newlyLow.length} មុខ ស្តុកចុះទាប — ចូល ស្តុក ដើម្បីពិនិត្យ`
          )
        }
      })
      .catch(() => { /* silent */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockAlertCount])

  /** Customers who currently owe money */
  const debtorCount = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter(c => !c.deletedAt && (c.debtBalance as number) > 0)
      .count(),
    []
  ) ?? 0

  /* ── Debt due-date reminder (once per app session) ──────────── */
  const dueCustomers = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter(c => !c.deletedAt && (c.debtBalance as number) > 0 && !!c.dueDate)
      .toArray(),
    []
  ) ?? []

  const dueNotifiedRef = useRef(false)
  useEffect(() => {
    if (dueNotifiedRef.current) return
    if (dueCustomers.length === 0) return   // wait until data has loaded

    const today = todayISODate()
    const overdue: string[] = []
    const soon:    string[] = []
    for (const c of dueCustomers) {
      const s = getDueInfo(c, today).status
      if (s === 'overdue') overdue.push(c.nameKm)
      else if (s === 'due-soon') soon.push(c.nameKm)
    }
    if (overdue.length === 0 && soon.length === 0) return

    dueNotifiedRef.current = true   // only once per session
    const names = [...overdue, ...soon].slice(0, 3).join(', ')
    const more  = overdue.length + soon.length - 3
    const title = overdue.length > 0 ? '🔴 បំណុលផុតថ្ងៃសង!' : '🟠 បំណុលជិតដល់ថ្ងៃសង'
    const body  =
      `សូមទាក់ទង៖ ${names}${more > 0 ? ` និង ${more} នាក់ទៀត` : ''}` +
      ` — ផុតថ្ងៃ ${overdue.length} · ជិតដល់ ${soon.length}`
    showNotif(title, body, 'debt-due')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueCustomers])

  const { storeName } = useStoreProfile()
  const badgeCount = (key: BadgeKey | undefined): number =>
    key === 'stock' ? stockAlertCount : key === 'debt' ? debtorCount : 0

  /* The POS shows its own cart bar on phone, so the tab bar hides there */
  const showTabBar = !pathname.startsWith('/sell')

  return (
    <div className="relative flex h-dvh w-full bg-bg">

      {/* ── iPad (md+): left rail ─────────────────────────────── */}
      <nav
        aria-label="ម៉ឺនុយមេ"
        className="hidden md:flex w-24 shrink-0 flex-col items-center gap-2 overflow-y-auto bg-ink-900 py-5"
      >
        <div
          className="mb-3 flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-md bg-accent text-title-sm font-bold text-ink-900"
          aria-hidden="true"
        >
          {firstGrapheme(storeName || 'ហាង')}
        </div>
        {RAIL.map((item) => {
          const active = isActive(item, pathname)
          const count  = badgeCount(item.badge)
          const Icon   = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex h-[68px] w-[78px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                active ? 'bg-accent text-ink-900' : 'text-ink-300 active:bg-ink-800',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="text-caption font-semibold leading-tight">{item.label}</span>
              {count > 0 && (
                <Pill variant="count" className="absolute top-1.5 right-2.5" aria-label={`${count}`}>
                  {count > 9 ? '9+' : count}
                </Pill>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Content column (phone: max 430px, centered) ───────── */}
      <div className="relative mx-auto flex w-full min-w-0 max-w-[430px] flex-1 flex-col md:max-w-none">
        <SyncStatusBar />

        <main
          className={cx(
            'min-h-0 flex-1 overflow-y-auto',
            // keep content clear of the floating tab bar (20 gap + 72 bar + 20 air)
            showTabBar && 'pb-[calc(112px+env(safe-area-inset-bottom))] md:pb-0',
          )}
        >
          {children}
        </main>

        <PWAInstallBanner />

        {/* ── Phone (< md): floating tab bar ──────────────────── */}
        {showTabBar && (
          <nav
            aria-label="ម៉ឺនុយមេ"
            className="absolute inset-x-3 bottom-[calc(20px+env(safe-area-inset-bottom))] z-30 flex h-[72px] items-stretch rounded-[26px] bg-surface px-1 shadow-float md:hidden"
          >
            {TABS_LEFT.map((item) => (
              <TabLink key={item.href} item={item} active={isActive(item, pathname)} count={badgeCount(item.badge)} />
            ))}

            {/* Raised center: លក់ */}
            <div className="relative flex flex-1 justify-center">
              <Link
                href={TAB_SELL.href}
                aria-current={isActive(TAB_SELL, pathname) ? 'page' : undefined}
                className={cx(
                  'absolute -top-[34px] flex h-[66px] w-[66px] flex-col items-center justify-center gap-0.5',
                  'rounded-xl border-[5px] border-bg bg-ink-900 text-white shadow-fab',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                )}
              >
                <LayoutGrid size={22} strokeWidth={2.5} className="text-accent" aria-hidden="true" />
                <span className="text-caption font-bold leading-none">{TAB_SELL.label}</span>
              </Link>
            </div>

            {TABS_RIGHT.map((item) => (
              <TabLink key={item.href} item={item} active={isActive(item, pathname)} count={badgeCount(item.badge)} />
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}

/** One slot of the phone tab bar. Inactive icons use nav-off; inactive labels
 *  use text-muted so the 12px text keeps 4.5:1 contrast on white. */
function TabLink({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[20px]',
        'focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ink-900',
      )}
    >
      <span className="relative">
        <Icon size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-ink-900' : 'text-nav-off'} aria-hidden="true" />
        {count > 0 && (
          <Pill variant="count" className="absolute -top-1.5 -right-2.5" aria-label={`${count}`}>
            {count > 9 ? '9+' : count}
          </Pill>
        )}
      </span>
      <span className={cx('text-caption font-bold leading-tight', active ? 'text-ink-900' : 'text-text-muted')}>
        {item.label}
      </span>
    </Link>
  )
}
