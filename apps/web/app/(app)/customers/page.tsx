'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Users, Phone } from 'lucide-react'
import { db } from '@/db'
import { formatDateKm } from '@/lib/date'
import { CustomerFormSheet } from '@/features/debt/components/CustomerFormSheet'
import { CustomerEditSheet } from '@/features/debt/components/CustomerEditSheet'
import { CustomerProfileSheet } from '@/features/debt/components/CustomerProfileSheet'
import { CustomerDetailSheet } from '@/features/debt/components/CustomerDetailSheet'
import { ReprintReceipt } from '@/features/sales/components/ReprintReceipt'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { MoneyText } from '@/components/ui/MoneyText'
import { LetterAvatar } from '@/components/ui/LetterAvatar'
import { Pill } from '@/components/ui/Pill'
import type { Customer, Sale } from '@/types'
import type { TenantId } from '@/types/branded'

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
    <div className="mx-auto w-full max-w-3xl md:px-6">

      <PageHeader
        title="អតិថិជន"
        subtitle={`${customers.length} នាក់`}
        backHref="/more"
        className="md:px-0"
        actions={
          <Button variant="dark" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => setAdding(true)}>
            បន្ថែម
          </Button>
        }
      />

      <div className="px-4 pb-6 md:px-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ស្វែង​ឈ្មោះ ឬ លេខ​ទូរស័ព្ទ…"
        />

        {/* List */}
        <div className="mt-3">
          {customers.length === 0 ? (
            <EmptyState
              icon={<Users size={30} strokeWidth={1.5} />}
              title="មិន​ទាន់​មាន​អតិថិជន"
              description="បន្ថែម​អតិថិជន​ដំបូង ដើម្បី​តាមដាន​ការ​ទិញ និង​បំណុល"
              action={
                <Button variant="dark" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => setAdding(true)}>
                  បន្ថែម​អតិថិជន
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-meta text-text-muted">រក​មិន​ឃើញ «{search}»</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const hasDebt = (c.debtBalance as number) > 0
                const last = lastPurchaseByCustomer[c.id as unknown as string]
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setProfile(c)}
                    className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                  >
                    <LetterAvatar name={c.nameKm} imageUri={c.imageUri} status={hasDebt ? 'overdue' : 'neutral'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-semibold text-text">{c.nameKm}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-meta text-text-muted">
                        {c.phone ? <><Phone size={13} className="shrink-0" aria-hidden="true" />{c.phone}</> : <span>គ្មាន​លេខ​ទូរស័ព្ទ</span>}
                      </p>
                      {last && (
                        <p className="mt-0.5 text-caption text-text-muted">ទិញ​ចុងក្រោយ៖ {formatDateKm(last)}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {hasDebt ? (
                        <MoneyText amount={c.debtBalance} tone="debt" align="right" />
                      ) : (
                        <Pill variant="success">✓ សងអស់</Pill>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
