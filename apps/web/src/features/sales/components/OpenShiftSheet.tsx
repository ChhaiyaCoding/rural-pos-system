'use client'

import { useState } from 'react'
import { Banknote, History, Lightbulb } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'
import { cashDrawerService } from '@/services/cashDrawer.service'
import { formatKHR, toKHR } from '@/lib/money'
import { StoreHistorySheet } from './StoreHistorySheet'
import type { CashDrawer } from '@/types'
import type { TenantId, UserId, KHR } from '@/types/branded'

const DEMO_TENANT  = 'tenant-demo' as TenantId
const DEMO_CASHIER = 'cashier-demo' as UserId

const QUICK_AMTS = [0, 10_000, 20_000, 50_000, 100_000, 200_000]

interface Props {
  cashierName: string
  onOpened:    (drawer: CashDrawer) => void
  onClose:     () => void
}

export function OpenShiftSheet({ cashierName, onOpened, onClose }: Props) {
  const [amount,  setAmount]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const parsedAmt = Math.max(0, Number(amount) || 0)

  const handleOpen = async () => {
    if (saving) return
    setSaving(true)
    try {
      const drawer = await cashDrawerService.open({
        tenantId:       DEMO_TENANT,
        cashierId:      DEMO_CASHIER,
        cashierName,
        openingBalance: toKHR(parsedAmt) as KHR,
      })
      onOpened(drawer)
    } finally {
      setSaving(false)
    }
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('km-KH', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="បើកហាង"
        subtitle={`${cashierName} · ${dateStr} · ${timeStr}`}
        headerActions={
          <Button variant="secondary" icon={<History size={18} strokeWidth={2.25} />} onClick={() => setShowHistory(true)}>
            ប្រវត្តិ
          </Button>
        }
        footer={
          <Button
            variant="primary"
            size="xl"
            fullWidth
            disabled={saving}
            onClick={handleOpen}
            icon={<Banknote size={22} strokeWidth={2.25} />}
          >
            {saving ? 'កំពុងបើក…' : 'បើកហាង'}
          </Button>
        }
      >
        <div className="space-y-5 pt-1">

          {/* Opening cash input */}
          <div>
            <label htmlFor="opening-cash" className="mb-2 block text-meta font-semibold text-text-subtle">
              ប្រាក់ក្នុងហ្គូពេលចាប់ផ្ដើម (រៀល)
            </label>
            <div className="flex items-center rounded-[18px] bg-bg focus-within:ring-2 focus-within:ring-ink-900/20">
              <input
                id="opening-cash"
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpen()}
                placeholder="0"
                autoFocus
                className="h-16 min-w-0 flex-1 bg-transparent px-5 text-amount font-bold tabular-nums text-text outline-none placeholder:text-text-muted"
              />
              <span className="pr-5 text-title-sm font-bold text-text-subtle">៛</span>
            </div>
            {parsedAmt > 0 && (
              <p className="mt-1.5 text-meta font-semibold text-success">
                = {formatKHR(toKHR(parsedAmt) as KHR)}
              </p>
            )}
          </div>

          {/* Quick amounts */}
          <div>
            <p className="mb-2 text-meta text-text-muted">ចំនួនរហ័ស</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMTS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  aria-pressed={amount === String(amt)}
                  className={cx(
                    'h-12 rounded-sm px-3.5 text-body-sm font-bold tabular-nums transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
                    amount === String(amt) ? 'bg-ink-900 text-white' : 'bg-bg text-text-subtle active:bg-line',
                  )}
                >
                  {amt === 0 ? '0 ៛' : formatKHR(toKHR(amt) as KHR)}
                </button>
              ))}
            </div>
          </div>

          {/* Info note */}
          <p className="flex items-start gap-2 rounded-md bg-surface-2 px-3.5 py-3 text-meta text-text-muted">
            <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>ប្រាក់ដែលមានក្នុងហ្គូ <span className="font-semibold text-text">មុន</span>ពេលចាប់ផ្ដើមលក់ថ្ងៃនេះ</span>
          </p>
        </div>
      </Sheet>

      {showHistory && <StoreHistorySheet onClose={() => setShowHistory(false)} />}
    </>
  )
}
