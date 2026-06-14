'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Users, Phone } from 'lucide-react'
import { db } from '@/db'
import { formatKHR, formatUSD } from '@/lib/money'
import { formatDateKm } from '@/lib/date'
import { CustomerFormSheet } from '@/features/debt/components/CustomerFormSheet'
import { CustomerEditSheet } from '@/features/debt/components/CustomerEditSheet'
import { CustomerProfileSheet } from '@/features/debt/components/CustomerProfileSheet'
import { CustomerDetailSheet } from '@/features/debt/components/CustomerDetailSheet'
import { ReprintReceipt } from '@/features/sales/components/ReprintReceipt'
import type { Customer, Sale } from '@/types'
import type { TenantId, KHR } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

export default function CustomersPage() {
  const [search,   setSearch]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [profile,  setProfile]  = useState<Customer | null>(null)
  const [editing,  setEditing]  = useState<Customer | null>(null)
  const [ledger,   setLedger]   = useState<Customer | null>(null)
  const [receipt,  setReceipt]  = useState<Sale | null>(null)

  const customers = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter(c => !c.deletedAt)
      .sortBy('nameKm'),
    []
  ) ?? []

  /* Last-purchase date per customer (from non-void sales) */
  const lastPurchaseByCustomer = useLiveQuery(async () => {
    const sales = await db.sales
      .where('tenantId').equals(DEMO_TENANT)
      .filter(s => !s.isVoid && !!s.customerId)
      .toArray()
    const map: Record<string, string> = {}
    for (const s of sales) {
      const k = s.customerId as unknown as string
      if (!map[k] || s.createdAt > map[k]) map[k] = s.createdAt
    }
    return map
  }, []) ?? {}

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.nameKm.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    )
  }, [customers, search])

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-slate-900">អតិថិជន</h1>
          <span className="text-[12px] text-slate-400 font-medium">{customers.length} នាក់</span>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែង​ឈ្មោះ ឬ លេខ​ទូរស័ព្ទ…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
          />
        </div>
      </header>

      {/* List */}
      {customers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
            <Users size={30} strokeWidth={1.5} className="text-slate-300" />
          </div>
          <p className="text-[14px] font-semibold text-slate-700">មិន​ទាន់​មាន​អតិថិជន</p>
          <p className="text-[12px] text-slate-400">បន្ថែម​អតិថិជន​ដំបូង ដើម្បី​តាមដាន​ការ​ទិញ និង​បំណុល</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-1 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary-600 text-white font-bold text-[14px] active:bg-primary-700 transition-colors"
          >
            <Plus size={18} strokeWidth={2.5} /> បន្ថែម​អតិថិជន
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[13px] text-slate-400">រក​មិន​ឃើញ «{search}»</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-24 max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
          {filtered.map((c) => {
            const hasDebt = (c.debtBalance as number) > 0
            const initial = c.nameKm.charAt(0) || '?'
            const last = lastPurchaseByCustomer[c.id as unknown as string]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setProfile(c)}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors text-left"
              >
                <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden border border-slate-100">
                  {c.imageUri ? (
                    <img src={c.imageUri} alt={c.nameKm} className="w-full h-full object-cover" />
                  ) : (
                    <div className={[
                      'w-full h-full flex items-center justify-center text-[17px] font-bold',
                      hasDebt ? 'bg-danger-100 text-danger-700' : 'bg-slate-100 text-slate-500',
                    ].join(' ')}>
                      {initial}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{c.nameKm}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                    {c.phone ? <><Phone size={11} className="shrink-0" />{c.phone}</> : <span>គ្មាន​លេខ​ទូរស័ព្ទ</span>}
                  </p>
                  {last && (
                    <p className="text-[11px] text-slate-400 mt-0.5">ទិញ​ចុងក្រោយ៖ {formatDateKm(last)}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {hasDebt ? (
                    <>
                      <p className="text-[14px] font-bold text-danger-600 tabular-nums leading-tight">{formatKHR(c.debtBalance)}</p>
                      <p className="text-[11px] font-bold text-primary-600 tabular-nums">{formatUSD(c.debtBalance)}</p>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700 bg-success-50 rounded-full px-2 py-0.5">
                      ✓ សងអស់
                    </span>
                  )}
                </div>
              </button>
            )
          })}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center active:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="បន្ថែម​អតិថិជន"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Sheets */}
      {adding && (
        <CustomerFormSheet onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />
      )}
      {profile && (
        <CustomerProfileSheet
          customer={profile}
          onClose={() => setProfile(null)}
          onEdit={(c) => setEditing(c)}
          onViewLedger={(c) => setLedger(c)}
          onOpenReceipt={(s) => setReceipt(s)}
        />
      )}
      {editing && (
        <CustomerEditSheet
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
      {ledger && (
        <CustomerDetailSheet customer={ledger} onClose={() => setLedger(null)} />
      )}
      {receipt && (
        <ReprintReceipt sale={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  )
}
