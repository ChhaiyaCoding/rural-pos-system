'use client'

import { useState, useRef } from 'react'
import { Camera, MapPin, Trash2, FileText, Lock } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { customerService } from '@/services/customer.service'
import { formatKHR, formatUSD } from '@/lib/money'
import type { Customer } from '@/types'
import type { CustomerId } from '@/types/branded'

interface Props {
  customer: Customer
  onClose: () => void
  onSaved: () => void
}

export function CustomerEditSheet({ customer, onClose, onSaved }: Props) {
  const [name,     setName]     = useState(customer.nameKm)
  const [phone,    setPhone]    = useState(customer.phone ?? '')
  const [address,  setAddress]  = useState(customer.address ?? '')
  const [note,     setNote]     = useState(customer.note ?? '')
  const [imageUri, setImageUri] = useState<string | null>(customer.imageUri)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const canSave  = name.trim().length > 0
  const isDirty  =
    name.trim()    !== customer.nameKm          ||
    phone.trim()   !== (customer.phone ?? '')   ||
    address.trim() !== (customer.address ?? '') ||
    note.trim()    !== (customer.note ?? '')    ||
    imageUri       !== customer.imageUri

  /* ── Photo picker ─────────────────────────────────── */
  const handlePickPhoto = () => fileRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImageUri(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /* ── Save ─────────────────────────────────────────── */
  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await customerService.update(customer.id as CustomerId, {
        nameKm:   name.trim(),
        phone:    phone.trim() || null,
        address:  address.trim() || null,
        note:     note.trim() || null,
        imageUri: imageUri,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ───────────────────────────────────────── */
  // Guard: a customer who still owes money may never be deleted — the debt
  // would silently disappear from the books. Cleared (=0) only.
  const hasDebt = customer.debtBalance > 0

  const handleDelete = async () => {
    if (deleting || hasDebt) return
    setDeleting(true)
    try {
      const ok = await customerService.softDelete(customer.id as CustomerId)
      if (ok) onSaved()
    } finally {
      setDeleting(false)
    }
  }

  const initial = name.trim().charAt(0) || customer.nameKm.charAt(0)

  return (
    <Sheet
      open
      onClose={onClose}
      title="កែប្រែអតិថិជន"
      footer={
        <>
          <Button variant="primary" size="xl" fullWidth disabled={!canSave || !isDirty || saving} onClick={handleSave}>
            {saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}
          </Button>
          {!isDirty && (
            <p className="mt-2 text-center text-meta text-text-muted">មិនទាន់មានការផ្លាស់ប្ដូរ</p>
          )}
        </>
      }
    >
      <div className="space-y-3 pt-1">

        {/* Photo picker */}
        <div className="flex flex-col items-center gap-2 pb-1">
          <button
            type="button"
            onClick={handlePickPhoto}
            className="relative h-20 w-20 rounded-full bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            aria-label="ផ្លាស់ប្ដូររូបភាព"
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
              {imageUri ? (
                <img src={imageUri} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-amount font-bold text-text-subtle">{initial}</span>
              )}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-ink-900 ring-4 ring-surface" aria-hidden="true">
              <Camera size={15} strokeWidth={2.5} />
            </span>
          </button>

          <div className="flex items-center gap-2">
            <p className="text-meta text-text-muted">ចុចដើម្បីផ្លាស់ប្ដូររូប</p>
            {imageUri && (
              <button
                type="button"
                onClick={() => setImageUri(null)}
                className="rounded-sm px-2 text-meta font-semibold text-danger focus-visible:outline-2 focus-visible:outline-danger"
              >
                លុបរូប ×
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <Input
          label="ឈ្មោះ *"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ឧ. សុខា, ដារ៉ា"
        />

        <Input
          label="លេខទូរស័ព្ទ (ស្រេចចិត្ត)"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="012 345 678"
        />

        <Textarea
          label="អាស័យដ្ឋាន (ស្រេចចិត្ត)"
          icon={<MapPin size={12} strokeWidth={2.5} />}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ភូមិ, ឃុំ, ស្រុក, ខេត្ត…"
          rows={3}
        />

        <Textarea
          label="កំណត់ចំណាំ (ស្រេចចិត្ត)"
          icon={<FileText size={12} strokeWidth={2.5} />}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ឧ. អតិថិជនជិតខាង, ទិញញឹកញាប់…"
          rows={2}
        />

        {/* Danger zone — Delete */}
        <div className="border-t border-line pt-3">
          {hasDebt ? (
            <div className="flex items-start gap-2.5 rounded-md bg-surface-2 px-4 py-3">
              <Lock size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-text">មិន​អាច​លុប​បាន</p>
                <p className="mt-0.5 text-meta text-text-subtle">
                  អតិថិជន​នេះ​នៅ​ជំពាក់{' '}
                  <span className="font-bold tabular-nums text-debt">{formatKHR(customer.debtBalance)}</span>
                  {' '}<span className="font-semibold tabular-nums text-text-muted">({formatUSD(customer.debtBalance)})</span>។
                  សូម​ទទួល​បំណុល​ឲ្យ​អស់​សិន មុន​ពេល​លុប។
                </p>
              </div>
            </div>
          ) : !confirmDel ? (
            <Button variant="dangerSoft" fullWidth icon={<Trash2 size={16} strokeWidth={2.25} />} onClick={() => setConfirmDel(true)}>
              លុបអតិថិជននេះ
            </Button>
          ) : (
            <div className="space-y-3 rounded-md bg-danger-bg px-4 py-3">
              <p className="text-body-sm font-semibold text-danger">
                ⚠️ អ្នកប្រាកដទេ? មិនអាចដកស្រង់វិញបានទេ!
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="h-12 flex-1 rounded-md bg-danger text-body font-bold text-white active:brightness-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                >
                  {deleting ? 'កំពុងលុប…' : 'បាទ/ចាស លុប'}
                </button>
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmDel(false)}>
                  បោះបង់
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
