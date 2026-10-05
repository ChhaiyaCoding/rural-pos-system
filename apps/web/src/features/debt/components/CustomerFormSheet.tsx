'use client'

import { useState, useRef } from 'react'
import { User, Camera, MapPin, FileText } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { customerService } from '@/services/customer.service'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  onClose: () => void
  onSaved: () => void
}

export function CustomerFormSheet({ onClose, onSaved }: Props) {
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [address,  setAddress]  = useState('')
  const [note,     setNote]     = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const canSave = name.trim().length > 0

  /* ── Photo picker ─────────────────────────────────── */
  const handlePickPhoto = () => fileRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageUri(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    // reset input so same file can be picked again
    e.target.value = ''
  }

  /* ── Save ─────────────────────────────────────────── */
  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await customerService.create({
        tenantId: DEMO_TENANT,
        nameKm:   name.trim(),
        ...(phone.trim()   ? { phone:    phone.trim()   } : {}),
        ...(address.trim() ? { address:  address.trim() } : {}),
        ...(note.trim()    ? { note:     note.trim()    } : {}),
        ...(imageUri       ? { imageUri               } : {}),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  /* ── First letter avatar (fallback) ───────────────── */
  const initial = name.trim().charAt(0)

  return (
    <Sheet
      open
      onClose={onClose}
      title="បន្ថែមអតិថិជន"
      footer={
        <Button variant="primary" size="xl" fullWidth disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'កំពុងរក្សាទុក…' : 'បន្ថែម'}
        </Button>
      }
    >
      <div className="space-y-3 pt-1">

        {/* ── Photo picker ──────────────────────────── */}
        <div className="flex flex-col items-center gap-2 pb-1">
          <button
            type="button"
            onClick={handlePickPhoto}
            className="relative h-20 w-20 rounded-full bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            aria-label="ជ្រើសរូបភាព"
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
              {imageUri ? (
                <img src={imageUri} alt="" className="h-full w-full object-cover" />
              ) : initial ? (
                <span className="text-amount font-bold text-text-subtle">{initial}</span>
              ) : (
                <User size={34} className="text-nav-off" aria-hidden="true" />
              )}
            </span>
            {/* Camera badge */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-ink-900 ring-4 ring-surface" aria-hidden="true">
              <Camera size={15} strokeWidth={2.5} />
            </span>
          </button>

          <p className="text-meta text-text-muted">ចុចដើម្បីដាក់រូប</p>

          {/* Hidden file input */}
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
      </div>
    </Sheet>
  )
}
