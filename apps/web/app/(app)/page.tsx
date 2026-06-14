'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ShoppingCart, PackagePlus, Wallet, HandCoins,
  TrendingUp, Package, Users, ChevronRight,
} from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { todayISODate, startOfTodayISO } from '@/lib/date'
import { useStoreProfile } from '@/store/storeProfile.store'
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
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <p className="text-[13px] text-slate-400">សួស្តី {cashierName} 👋</p>
        <h1 className="text-[19px] font-bold text-slate-900">{storeName}</h1>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-8 space-y-4 max-w-xl mx-auto">

          {/* Today stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingCart size={14} className="text-success-600" />
                <p className="text-[11px] font-semibold text-slate-400">ការលក់ថ្ងៃនេះ</p>
              </div>
              <p className="text-[20px] font-extrabold text-slate-900 tabular-nums leading-tight">{formatKHR(todayRevenue)}</p>
              <p className="text-[12px] font-bold text-primary-600 tabular-nums">{formatUSD(todayRevenue)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{todayCount} ការលក់</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} className={todayProfit >= 0 ? 'text-success-600' : 'text-danger-600'} />
                <p className="text-[11px] font-semibold text-slate-400">ចំណេញថ្ងៃនេះ</p>
              </div>
              <p className={[
                'text-[20px] font-extrabold tabular-nums leading-tight',
                todayProfit >= 0 ? 'text-success-700' : 'text-slate-900',
              ].join(' ')}>{formatKHR(todayProfit)}</p>
              <p className={[
                'text-[12px] font-bold tabular-nums',
                todayProfit >= 0 ? 'text-primary-600' : 'text-danger-600',
              ].join(' ')}>{formatUSD(todayProfit)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ចំណូល − ចំណាយ</p>
            </div>
          </div>

          {/* Low stock alert */}
          <Link
            href="/inventory"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-card px-4 py-3.5 active:bg-slate-50 transition-colors"
          >
            <div className={[
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              lowStockCount > 0 ? 'bg-warning-50 text-warning-600' : 'bg-slate-50 text-slate-400',
            ].join(' ')}>
              <Package size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800">ស្តុកជិតអស់</p>
              <p className="text-[12px] text-slate-400">
                {lowStockCount > 0 ? `${lowStockCount} មុខ ត្រូវ​បន្ថែម​ស្តុក` : 'ស្តុក​គ្រប់គ្រាន់'}
              </p>
            </div>
            {lowStockCount > 0 && (
              <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-warning-500 text-white text-[12px] font-bold flex items-center justify-center tabular-nums">
                {lowStockCount}
              </span>
            )}
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </Link>

          {/* Debt summary */}
          <Link
            href="/debt"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-card px-4 py-3.5 active:bg-slate-50 transition-colors"
          >
            <div className={[
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              debtorCount > 0 ? 'bg-danger-50 text-danger-600' : 'bg-slate-50 text-slate-400',
            ].join(' ')}>
              <Users size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800">បំណុលអតិថិជន</p>
              <p className="text-[12px] text-slate-400">{debtorCount} នាក់ជំពាក់</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-bold text-danger-600 tabular-nums leading-tight">{formatKHR(totalDebt)}</p>
              <p className="text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(totalDebt)}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </Link>

          {/* Quick actions */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">សកម្មភាពរហ័ស</p>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction href="/sell"      icon={<ShoppingCart size={20} strokeWidth={2.25} />} label="លក់ទំនិញ"     primary />
              <QuickAction href="/inventory" icon={<PackagePlus size={20} strokeWidth={2.25} />}  label="បន្ថែមទំនិញ" />
              <QuickAction href="/expenses"  icon={<Wallet size={20} strokeWidth={2.25} />}       label="កត់ចំណាយ"    />
              <QuickAction href="/debt"      icon={<HandCoins size={20} strokeWidth={2.25} />}    label="ទទួលបំណុល"   />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function QuickAction({
  href, icon, label, primary = false,
}: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2.5 rounded-2xl px-4 h-16 font-bold text-[14px] shadow-card active:scale-[0.99] transition-all',
        primary
          ? 'bg-primary-600 text-white active:bg-primary-700'
          : 'bg-white border border-slate-200 text-slate-800 active:bg-slate-50',
      ].join(' ')}
    >
      <span className={primary ? 'text-white' : 'text-primary-600'}>{icon}</span>
      {label}
    </Link>
  )
}
