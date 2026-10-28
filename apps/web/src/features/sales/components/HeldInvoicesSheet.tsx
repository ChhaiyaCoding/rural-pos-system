'use client'

import { Trash2, PlayCircle, PauseCircle } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { MoneyText } from '@/components/ui/MoneyText'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { heldInvoiceService } from '@/services/heldInvoice.service'
import { formatDateTimeKm } from '@/lib/date'
import { EmptyState } from '@/components/ui/EmptyState'
import type { CartItem, HeldInvoice } from '@/types'
import type { TenantId, UUID } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  onClose:  () => void
  onResume: (items: CartItem[]) => void
}

export function HeldInvoicesSheet({ onClose, onResume }: Props) {
  const held = useLiveQuery(() => heldInvoiceService.list(DEMO_TENANT), []) ?? []

  const handleResume = async (h: HeldInvoice) => {
    onResume(h.items)
    await heldInvoiceService.remove(h.id as UUID)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} tone="bg" title={`វិក្កយបត្រ​ផ្អាក (${held.length})`}>
      {held.length === 0 ? (
        <EmptyState
          icon={<PauseCircle size={30} strokeWidth={1.5} />}
          title="គ្មាន​វិក្កយបត្រ​ផ្អាក"
          description="ផ្អាក​កន្ត្រក​ពេល​មាន​អតិថិជន​ផ្សេង​ចូល​មុន"
        />
      ) : (
        <div className="space-y-2.5 pb-2">
          {held.map((h) => (
            <div key={h.id} className="rounded-lg bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-bold text-text">
                    {h.label || `ផ្អាក · ${h.count} មុខ`}
                  </p>
                  <p className="mt-0.5 text-meta text-text-muted">
                    {h.count} មុខ · {formatDateTimeKm(h.createdAt)}
                  </p>
                </div>
                <MoneyText amount={h.total} align="right" />
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  icon={<PlayCircle size={18} strokeWidth={2.25} />}
                  onClick={() => handleResume(h)}
                >
                  បន្ត​លក់
                </Button>
                <IconButton aria-label="លុប" variant="soft" onClick={() => db.heldInvoices.delete(h.id)}>
                  <Trash2 size={18} className="text-danger" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
