'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import {
  ShoppingCart,
  Package,
  Users,
  BarChart2,
  Settings,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { SyncStatusBar } from '@/components/shared/SyncStatusBar'
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
function showNotif(title: string, body: string, icon = '/icons/icon-192x192.png') {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon, badge: icon, tag: 'low-stock' })
}

const NAV = [
  { href: '/',          icon: ShoppingCart, label: 'លក់'       },
  { href: '/inventory', icon: Package,      label: 'ស្តុក'      },
  { href: '/debt',      icon: Users,        label: 'បំណុល'     },
  { href: '/reports',   icon: BarChart2,    label: 'របាយការណ៍' },
  { href: '/settings',  icon: Settings,     label: 'ការកំណត់'  },
]

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

  return (
    <div className="flex flex-col h-dvh w-full max-w-[430px] md:max-w-full mx-auto bg-white">
      <SyncStatusBar />

      <main className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>

      <nav className="shrink-0 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        {/* Constrain nav items to reasonable width on very wide screens */}
        <div className="flex h-[58px] max-w-screen-md mx-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href

            /* Badge value + color per tab */
            const badge      = href === '/inventory' ? stockAlertCount
                             : href === '/debt'      ? debtorCount
                             : 0
            const badgeClass = href === '/inventory'
              ? 'bg-warning-500'
              : 'bg-danger-500'

            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center flex-1 gap-1 select-none"
              >
                {/* Active top indicator */}
                <span
                  className={[
                    'absolute top-0 h-0.5 w-9 rounded-full transition-colors',
                    active ? 'bg-primary-600' : 'bg-transparent',
                  ].join(' ')}
                />

                {/* Icon with alert badge */}
                <span className="relative">
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 1.9}
                    className={active ? 'text-primary-600' : 'text-slate-400'}
                    aria-hidden="true"
                  />
                  {badge > 0 && (
                    <span
                      className={[
                        'absolute -top-1.5 -right-2',
                        'min-w-[16px] h-[16px] px-0.5 rounded-full',
                        'flex items-center justify-center',
                        'text-[9px] font-black text-white leading-none',
                        badgeClass,
                      ].join(' ')}
                      aria-label={`${badge} alerts`}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>

                <span
                  className={[
                    'text-[10.5px] transition-colors',
                    active ? 'text-primary-700 font-bold' : 'text-slate-400 font-medium',
                  ].join(' ')}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
