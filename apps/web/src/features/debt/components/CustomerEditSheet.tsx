'use client'

import { useState, useRef } from 'react'
import { X, Camera, MapPin, Trash2 } from 'lucide-react'
import { customerService } from '@/services/customer.service'
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
        imageUri: imageUri,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ───────────────────────────────────────── */
  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await customerService.softDelete(customer.id as CustomerId)
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  const initial = name.trim().charAt(0) || customer.nameKm.charAt(0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl flex flex-col shadow-pop animate-sheet-up max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ───────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <span className="text-[16px] font-bold text-slate-900">កែប្រែអតិថិជន</span>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-4">

          {/* Photo picker */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handlePickPhoto}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-primary-50 border-2 border-dashed border-primary-300 active:opacity-80 transition-opacity"
              aria-label="ផ្លាស់ប្ដូររូបភាព"
            >
              {imageUri ? (
                <img src={imageUri} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[32px] font-bold text-primary-600 flex items-center justify-center w-full h-full">
                  {initial}
                </span>
              )}
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md">
                <Camera size={13} strokeWidth={2.5} />
              </span>
            </button>

            <div className="flex items-center gap-3">
              <p className="text-[11px] text-slate-400">ចុចដើម្បីផ្លាស់ប្ដូររូប</p>
              {imageUri && (
                <button
                  type="button"
                  onClick={() => setImageUri(null)}
                  className="text-[11px] text-danger-500 font-semibold active:text-danger-700"
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

          {/* Name */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">ឈ្មោះ *</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ឧ. សុខា, ដារ៉ា"
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-[15px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
            />
          </div>

          {/* Phone */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5">លេខទូរស័ព្ទ (ស្រេចចិត្ត)</p>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="012 345 678"
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-[15px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
            />
          </div>

          {/* Address */}
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <MapPin size={12} strokeWidth={2.5} />
              អាស័យដ្ឋាន (ស្រេចចិត្ត)
            </p>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ភូមិ, ឃុំ, ស្រុក, ខេត្ត…"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 resize-none leading-relaxed"
            />
          </div>

          {/* Danger zone — Delete */}
          <div className="pt-2 border-t border-slate-100">
            {!confirmDel ? (
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="flex items-center gap-2 text-[13px] font-semibold text-danger-500 active:text-danger-700 py-1"
              >
                <Trash2 size={14} strokeWidth={2.25} />
                លុបអតិថិជននេះ
              </button>
            ) : (
              <div className="rounded-xl bg-danger-50 border border-danger-100 px-4 py-3 space-y-3">
                <p className="text-[13px] font-semibold text-danger-700">
                  ⚠️ អ្នកប្រាកដទេ? មិនអាចដកស្រង់វិញបានទេ!
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="flex-1 h-10 rounded-xl bg-danger-600 text-white font-bold text-[13px] disabled:opacity-50 active:bg-danger-700 transition-colors"
                  >
                    {deleting ? 'កំពុងលុប…' : 'បាទ/ចាស លុប'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(false)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] active:bg-slate-50"
                  >
                    បោះបង់
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────── */}
        <div className="shrink-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={!canSave || !isDirty || saving}
            onClick={handleSave}
            className="w-full h-14 rounded-xl bg-primary-600 text-white font-bold text-[16px] disabled:opacity-40 disabled:pointer-events-none active:bg-primary-700 transition-colors"
          >
            {saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}
          </button>
          {!isDirty && (
            <p className="text-center text-[11px] text-slate-400 mt-2">
              មិនទាន់មានការផ្លាស់ប្ដូរ
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
