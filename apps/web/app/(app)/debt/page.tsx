'use client'

import { useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatKHR, toKHR } from '@/lib/money'
import { formatDateKm, startOfTodayISO } from '@/lib/date'
import { getDueInfo } from '@/lib/dueDate'
import { CustomerFormSheet } from '@/features/debt/components/CustomerFormSheet'
import { CustomerDetailSheet } from '@/features/debt/components/CustomerDetailSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { MoneyText } from '@/components/ui/MoneyText'
import { StatTile } from '@/components/ui/StatTile'
import { LetterAvatar } from '@/components/ui/LetterAvatar'
import { Pill } from '@/components/ui/Pill'
import type { Customer } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

type DebtTab = 'all' | 'outstanding' | 'partial' | 'paid'

interface CustStat { charged: number; paid: number; lastPayment: string | null }

export default function DebtPage() {
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState<DebtTab>('all')
  const [adding,   setAdding]   = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)

  const customers = useLiveQuery(
    () => db.customers
      .where('tenantId').equals(DEMO_TENANT)
      .filter((c) => !c.deletedAt)
      .sortBy('nameKm'),
    []
  ) ?? []

  /* All debt transactions (non-void) — drives per-customer charged/paid/last-payment */
  const txns = useLiveQuery(
    () => db.debtTransactions.where('tenantId').equals(DEMO_TENANT).filter(t => !t.isVoid).toArray(),
    []
  ) ?? []

  const statByCustomer = useMemo(() => {
    const m = new Map<string, CustStat>()
    for (const t of txns) {
      const s = m.get(t.customerId) ?? { charged: 0, paid: 0, lastPayment: null }
      if (t.type === 'charge') s.charged += t.amount as number
      else {
        s.paid += t.amount as number
        if (!s.lastPayment || t.createdAt > s.lastPayment) s.lastPayment = t.createdAt
      }
      m.set(t.customerId, s)
    }
    return m
  }, [txns])

  const stat = (c: Customer): CustStat => statByCustomer.get(c.id) ?? { charged: 0, paid: 0, lastPayment: null }

  /* Per-customer status: paid (cleared) · partial (owes + paid some) · outstanding (owes) · none */
  const statusOf = (c: Customer): 'paid' | 'partial' | 'outstanding' | 'none' => {
    const s = stat(c)
    if (c.debtBalance > 0) return s.paid > 0 ? 'partial' : 'outstanding'
    return s.charged > 0 ? 'paid' : 'none'
  }

  /* ── Dashboard aggregates ──────────────────────────────────── */
  const totalOutstanding = toKHR(customers.reduce((s, c) => s + c.debtBalance, 0))
  const owingCount   = customers.filter((c) => c.debtBalance > 0).length
  const overdueCount = customers.filter((c) => getDueInfo(c).status === 'overdue').length

  const todayStart = useMemo(() => startOfTodayISO(), [])
  const collectedToday = toKHR(
    txns.filter(t => t.type === 'payment' && t.createdAt >= todayStart).reduce((s, t) => s + (t.amount as number), 0)
  )

  /* ── Filters ───────────────────────────────────────────────── */
  const counts = useMemo(() => ({
    all:         customers.length,
    outstanding: customers.filter(c => c.debtBalance > 0).length,
    partial:     customers.filter(c => statusOf(c) === 'partial').length,
    paid:        customers.filter(c => statusOf(c) === 'paid').length,
  }), [customers, statByCustomer])

  const TABS: Array<{ id: DebtTab; label: string; tone: 'primary' | 'danger' | 'warning' | 'success' }> = [
    { id: 'all',         label: 'ទាំងអស់',  tone: 'primary' },
    { id: 'outstanding', label: 'នៅជំពាក់', tone: 'danger'  },
    { id: 'partial',     label: 'បង់ខ្លះ',   tone: 'warning' },
    { id: 'paid',        label: 'សងអស់',    tone: 'success' },
  ]

  const filtered = customers
    .filter((c) =>
      tab === 'all'         ? true
      : tab === 'outstanding' ? c.debtBalance > 0
      : tab === 'partial'     ? statusOf(c) === 'partial'
      : statusOf(c) === 'paid'
    )
    .filter((c) =>
      search === '' ||
      c.nameKm.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
    )

  /* Status tiles drive the existing filters; tapping the active one shows all again */
  const FILTER_TILES: Array<{ id: Exclude<DebtTab, 'all'>; dot: string }> = [
    { id: 'outstanding', dot: 'bg-debt-on-dark' },
    { id: 'partial',     dot: 'bg-accent' },
    { id: 'paid',        dot: 'bg-success-on-dark' },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl md:px-6 md:pt-6">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <PageHeader
        variant="hero"
        className="md:rounded-xl"
        title="សៀវភៅបំណុល"
        subtitle={`${customers.length} នាក់`}
        actions={
          <Button variant="primary" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => setAdding(true)}>
            អតិថិជន
          </Button>
        }
      >
        <p className="text-meta font-semibold text-ink-300">បំណុលសរុប</p>
        <MoneyText amount={totalOutstanding} size="xl" tone="debtOnDark" />
        <p className="mt-1 text-meta tabular-nums text-ink-300">
          {owingCount} នាក់ជំពាក់ · ប្រមូលថ្ងៃនេះ{' '}
          <span className="font-semibold text-success-on-dark">{formatKHR(collectedToday)}</span>
          {overdueCount > 0 && (
            <> · <span className="font-semibold text-debt-on-dark">ផុតកំណត់ {overdueCount} នាក់</span></>
          )}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {FILTER_TILES.map((f) => {
            const t = TABS.find((x) => x.id === f.id)!
            return (
              <StatTile
                key={f.id}
                tone="onDark"
                dot={f.dot}
                label={t.label}
                value={`${counts[f.id]} នាក់`}
                pressed={tab === f.id}
                onClick={() => setTab(tab === f.id ? 'all' : f.id)}
              />
            )
          })}
        </div>
      </PageHeader>

      <div className="px-4 pb-6 pt-4 md:px-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ស្វែង​ឈ្មោះ ឬ លេខ​ទូរស័ព្ទ…"
        />
        {tab !== 'all' && (
          <p className="mt-3 text-meta text-text-muted">
            {TABS.find((x) => x.id === tab)?.label} · {filtered.length} នាក់ ·{' '}
            <button type="button" onClick={() => setTab('all')} className="font-semibold text-text underline underline-offset-2">
              បង្ហាញទាំងអស់ ({counts.all})
            </button>
          </p>
        )}

        {/* ── Customer list ───────────────────────────────── */}
        <div className="mt-3">
          {customers.length === 0 ? (
            <EmptyState
              icon={<Users size={30} strokeWidth={1.5} />}
              title="មិន​ទាន់​មាន​អតិថិជន"
              description="ចុច + ដើម្បី​បន្ថែម​អតិថិជន​ដំបូង"
            />
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-meta text-text-muted">
              {search !== ''        ? `រក​មិន​ឃើញ «${search}»`
              : tab === 'outstanding' ? 'គ្មាន​អ្នក​ជំពាក់​ទេ 🎉'
              : tab === 'partial'     ? 'គ្មាន​អ្នក​បង់​ខ្លះ'
              : tab === 'paid'        ? 'មិន​ទាន់​មាន​អ្នក​សង​អស់'
              : 'មិន​ទាន់​មាន​អតិថិជន'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((customer) => {
                const s        = stat(customer)
                const status   = statusOf(customer)
                const hasDebt  = customer.debtBalance > 0
                const due      = getDueInfo(customer)
                const dueLabel =
                  due.daysUntilDue === null ? null
                  : due.daysUntilDue < 0  ? `ផុត ${-due.daysUntilDue} ថ្ងៃ`
                  : due.daysUntilDue === 0 ? 'សង​ថ្ងៃនេះ'
                  : `នៅ ${due.daysUntilDue} ថ្ងៃ`
                const avatarTone =
                  due.status === 'overdue' ? 'overdue'
                  : due.daysUntilDue === 0 ? 'dueToday'
                  : 'neutral'
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelected(customer)}
                    className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                  >
                    <LetterAvatar name={customer.nameKm} imageUri={customer.imageUri} status={avatarTone} />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-semibold text-text">{customer.nameKm}</p>
                      {customer.phone && <p className="text-meta text-text-muted">{customer.phone}</p>}
                      {(s.charged > 0 || s.paid > 0) && (
                        <p className="mt-0.5 text-caption tabular-nums text-text-muted">
                          ជំពាក់ {formatKHR(toKHR(s.charged))} · សង {formatKHR(toKHR(s.paid))}
                          {s.lastPayment && <> · ចុង {formatDateKm(s.lastPayment)}</>}
                        </p>
                      )}
                      {((due.status === 'overdue' || due.status === 'due-soon') && dueLabel) || status === 'partial' ? (
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {(due.status === 'overdue' || due.status === 'due-soon') && dueLabel && (
                            <Pill variant={due.status === 'overdue' ? 'debt' : 'warn'}>{dueLabel}</Pill>
                          )}
                          {status === 'partial' && <Pill variant="warn">បង់ខ្លះ</Pill>}
                        </span>
                      ) : null}
                    </div>

                    {/* Remaining */}
                    <div className="shrink-0 text-right">
                      {hasDebt ? (
                        <MoneyText amount={customer.debtBalance} tone="debt" align="right" />
                      ) : status === 'paid' ? (
                        <Pill variant="success">✓ សងអស់</Pill>
                      ) : (
                        <span className="text-meta text-text-muted">—</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {adding && (
        <CustomerFormSheet onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />
      )}
      {selected && (
        <CustomerDetailSheet customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
