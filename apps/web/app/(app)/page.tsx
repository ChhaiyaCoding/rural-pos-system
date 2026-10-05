'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ShoppingCart, PackagePlus, Wallet, HandCoins,
  Package, Users, ChartColumn, ArrowRight, CircleCheck,
} from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { todayISODate, startOfTodayISO } from '@/lib/date'
import { useStoreProfile } from '@/store/storeProfile.store'
import { PageHeader } from '@/components/ui/PageHeader'
import { MoneyText } from '@/components/ui/MoneyText'
import { StatTile } from '@/components/ui/StatTile'
import { ListRow } from '@/components/ui/ListRow'
import { Pill } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import { firstGrapheme } from '@/components/ui/text'
import type { KHR, TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

export default function HomePage() {
  const { storeName, cashierName } = useStoreProfile()
  const today    = todayISODate()
  const startISO = startOfTodayISO()

  /* Today's sales (non-void) */
  const todaySales = useLiveQuery(
    () => db.sales
      .where('tenantId').equals(DEMO_TENANT)
      .filter(s => !s.isVoid && s.createdAt >= startISO)
      .toArray(),
    [startISO]
  ) ?? []
  const todayRevenue = todaySales.reduce((s, x) => s + (x.totalAmount as number), 0) as KHR
  const todayCount   = todaySales.length

  /* Today's expenses */
  const todayExpenses = useLiveQuery(
    () => db.expenses
      .where('tenantId').equals(DEMO_TENANT)
      .filter(e => !e.deletedAt && e.spentAt === today)
      .toArray(),
    [today]
  ) ?? []
  const todayExpenseTotal = todayExpenses.reduce((s, e) => s + (e.amount as number), 0) as KHR
  const todayProfit       = (todayRevenue - todayExpenseTotal) as KHR

  /* Low stock */
  const lowStockCount = useLiveQuery(
    () => db.products
      .where('tenantId').equals(DEMO_TENANT)
      .filter(p => !p.deletedAt && p.stockQty <= p.lowStockThreshold)
      .count(),
    []
  ) ?? 0

  /* Debt */
  const customers = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter(c => !c.deletedAt)
      .toArray(),
    []
  ) ?? []
  const totalDebt   = customers.reduce((s, c) => s + (c.debtBalance as number), 0) as KHR
  const debtorCount = customers.filter(c => (c.debtBalance as number) > 0).length

  return (
    <div className="mx-auto w-full max-w-5xl md:px-6 md:pt-6">
      <div className="md:grid md:grid-cols-3 md:items-start md:gap-5">

        {/* ── Hero: today's sales + stats + quick actions ───────── */}
        <div className="md:col-span-2">
          <PageHeader
            variant="hero"
            className="md:rounded-xl md:pb-6"
            leading={
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-title-sm font-bold text-ink-900" aria-hidden="true">
                {firstGrapheme(storeName || 'ហាង')}
              </span>
            }
            title={storeName}
            subtitle={`សួស្តី ${cashierName}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-meta font-semibold text-ink-300">ការលក់ថ្ងៃនេះ</p>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1 rounded-sm px-2 text-meta font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                របាយការណ៍
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            </div>
            <MoneyText amount={todayRevenue} size="xl" tone="onDark" usd={false} />
            <p className="text-meta tabular-nums text-ink-300">
              {formatUSD(todayRevenue)} · {todayCount} វិក្កយបត្រ
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatTile
                tone="onDark"
                label="ចំណេញ"
                value={formatKHR(todayProfit)}
                dot={todayProfit >= 0 ? 'bg-success-on-dark' : 'bg-debt-on-dark'}
              />
              <StatTile tone="onDark" label="ចំណាយ" value={formatKHR(todayExpenseTotal)} />
              <StatTile tone="onDark" label="ជំពាក់" value={formatKHR(totalDebt)} sub={`${debtorCount} នាក់`} />
            </div>
          </PageHeader>

          {/* Quick actions */}
          <nav aria-label="សកម្មភាពរហ័ស" className="grid grid-cols-4 gap-2 px-4 pt-5 md:px-0">
            <QuickAction href="/sell"      icon={<ShoppingCart size={24} strokeWidth={2.25} />} label="លក់ទំនិញ"    primary />
            <QuickAction href="/inventory" icon={<PackagePlus size={24} strokeWidth={2.25} />}  label="បន្ថែមទំនិញ" />
            <QuickAction href="/expenses"  icon={<Wallet size={24} strokeWidth={2.25} />}       label="កត់ចំណាយ"    />
            <QuickAction href="/debt"      icon={<HandCoins size={24} strokeWidth={2.25} />}    label="ទទួលបំណុល"   />
          </nav>
        </div>

        {/* ── Today's to-do ──────────────────────────────────────── */}
        <section className="px-4 pb-6 pt-6 md:px-0 md:pt-0">
          <h2 className="mb-2.5 text-title-sm font-bold text-text">ត្រូវធ្វើថ្ងៃនេះ</h2>
          <div className="space-y-2">
            {/* Only rows with something to act on; otherwise one "all good" row */}
            {lowStockCount > 0 && (
              <ListRow
                href="/inventory"
                leading={
                  <TaskIcon tone="warn">
                    <Package size={22} strokeWidth={2} />
                  </TaskIcon>
                }
                title="ស្តុកជិតអស់"
                meta={`${lowStockCount} មុខ ត្រូវ​បន្ថែម​ស្តុក`}
                trailing={<Pill variant="warn">{lowStockCount}</Pill>}
                chevron
              />
            )}
            {debtorCount > 0 && (
              <ListRow
                href="/debt"
                leading={
                  <TaskIcon tone="debt">
                    <Users size={22} strokeWidth={2} />
                  </TaskIcon>
                }
                title="បំណុលអតិថិជន"
                meta={`${debtorCount} នាក់ជំពាក់`}
                trailing={<MoneyText amount={totalDebt} tone="debt" align="right" />}
                chevron
              />
            )}
            {lowStockCount === 0 && debtorCount === 0 && (
              <ListRow
                leading={
                  <TaskIcon tone="success">
                    <CircleCheck size={22} strokeWidth={2} />
                  </TaskIcon>
                }
                title="អ្វីៗ​ល្អ​ទាំងអស់"
                meta="ស្តុក​គ្រប់គ្រាន់ · គ្មាន​អតិថិជន​ជំពាក់"
              />
            )}
            <ListRow
              href="/reports"
              leading={
                <TaskIcon tone="ink">
                  <ChartColumn size={22} strokeWidth={2} />
                </TaskIcon>
              }
              title="របាយការណ៍"
              meta="ចំណូល · ចំណាយ · ចំណេញ"
              chevron
            />
          </div>
        </section>
      </div>
    </div>
  )
}

/** Round-square quick action: 62px icon tile with the label underneath. */
function QuickAction({
  href, icon, label, primary = false,
}: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
    >
      <span
        className={cx(
          'flex h-[62px] w-[62px] items-center justify-center rounded-[20px] transition-transform active:scale-95',
          primary ? 'bg-accent text-ink-900' : 'bg-surface text-ink-900',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="text-center text-meta font-semibold leading-tight text-text">{label}</span>
    </Link>
  )
}

/** 48px tinted icon tile for a to-do row. */
function TaskIcon({ tone, children }: { tone: 'warn' | 'debt' | 'ink' | 'success' | 'neutral'; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'flex h-12 w-12 items-center justify-center rounded-md',
        tone === 'warn' ? 'bg-warn-bg text-warn'
          : tone === 'debt' ? 'bg-debt-bg text-debt'
          : tone === 'ink' ? 'bg-ink-900 text-accent'
          : tone === 'success' ? 'bg-success-bg text-success'
          : 'bg-surface-2 text-text-muted',
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}
