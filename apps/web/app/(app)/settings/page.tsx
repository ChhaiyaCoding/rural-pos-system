'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, X, User, FileText, Check,
  Package, ChevronRight, Info, ShieldAlert, Receipt, Database,
  LogOut, Trash2, Banknote, Pencil,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Pill } from '@/components/ui/Pill'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cx } from '@/components/ui/cx'
import { firstGrapheme } from '@/components/ui/text'
import { useStoreProfile } from '@/store/storeProfile.store'
import { useAuthStore } from '@/store/auth.store'
import { BackupSheet } from '@/features/settings/components/BackupSheet'
import { backupService } from '@/services/backup.service'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { formatKHR } from '@/lib/money'
import { toKHR } from '@/lib/money'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

export default function SettingsPage() {
  const {
    storeName, storeAddress, storePhone,
    storeLogo, cashierName, receiptFooter,
    receiptHeaderNote, receiptShowLogo, receiptShowCashier,
    receiptShowPhone, receiptShowAddress, exchangeRate,
    update, clearLogo,
  } = useStoreProfile()

  /* Local form state — saves only on «រក្សាទុក» */
  const [name,       setName]       = useState(storeName)
  const [address,    setAddress]    = useState(storeAddress)
  const [phone,      setPhone]      = useState(storePhone)
  const [cashier,    setCashier]    = useState(cashierName)
  const [footer,     setFooter]     = useState(receiptFooter)
  const [headerNote, setHeaderNote] = useState(receiptHeaderNote)
  const [threshold,  setThreshold]  = useState('5')   // low-stock default
  const [rate,       setRate]       = useState(String(exchangeRate))
  const [saved,      setSaved]      = useState(false)
  const [showPreview,  setShowPreview]  = useState(false)
  const [showBackup,   setShowBackup]   = useState(false)
  const [showSignOut,  setShowSignOut]  = useState(false)
  const [signingOut,   setSigningOut]   = useState(false)
  const [showReset,    setShowReset]    = useState(false)
  const [resetting,    setResetting]    = useState(false)

  const router    = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Logo ─────────────────────────────────────────────── */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => update({ storeLogo: ev.target?.result as string })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /* ── Save ─────────────────────────────────────────────── */
  const handleSave = () => {
    const parsedRate = Math.max(1, Number(rate) || 4000)
    update({
      storeName:         name.trim()    || 'ហាងលក់ទំនិញ',
      storeAddress:      address.trim() || 'ភ្នំពេញ · Cambodia',
      storePhone:        phone.trim(),
      cashierName:       cashier.trim() || 'សុខា',
      receiptFooter:     footer.trim()  || '🙏 អរគុណដែលបានមកទិញ!',
      receiptHeaderNote: headerNote.trim(),
      exchangeRate:      parsedRate,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const isDirty =
    name.trim()       !== storeName     ||
    address.trim()    !== storeAddress  ||
    phone.trim()      !== storePhone    ||
    cashier.trim()    !== cashierName   ||
    footer.trim()     !== receiptFooter ||
    headerNote.trim() !== receiptHeaderNote ||
    (Number(rate) || 4000) !== exchangeRate

  const displayName = name.trim() || storeName

  /* ── Sign out ──────────────────────────────────────────────── */
  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      // Clear demo session cookie
      document.cookie = 'pos-demo-session=; path=/; max-age=0'
      // Clear Zustand auth store (persisted in localStorage)
      clearAuth()
      // Sign out from Supabase if configured
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        const { createClient } = await import('@/lib/supabase/client')
        await createClient().auth.signOut()
      }
      router.replace('/login')
    } catch {
      setSigningOut(false)
    }
  }

  /* ── Reset all data → wipe + restore demo data ─────────────── */
  const handleResetData = async () => {
    setResetting(true)
    try {
      await backupService.clearAll()
      // Re-seed fresh demo data so the app isn't left empty
      await productService.seedIfEmpty(DEMO_TENANT)
      await customerService.seedIfEmpty(DEMO_TENANT)
      // Full reload so every screen + cart picks up the clean data
      window.location.href = '/'
    } catch {
      setResetting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl md:px-6">

      <PageHeader title="ការកំណត់" subtitle="កំណត់ព័ត៌មានហាង និងមុខងារ" backHref="/more" className="md:px-0" />

      <div className="space-y-5 px-4 pb-8 md:px-0">

        {/* ══ Store card (ink) ═══════════════════════════════ */}
        <section className="rounded-xl bg-ink-900 p-4 text-white">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {storeLogo ? (
                <img src={storeLogo} alt="logo" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent text-title font-bold text-ink-900" aria-hidden="true">
                  {firstGrapheme(displayName || 'ហ')}
                </div>
              )}
              {storeLogo && (
                <button
                  type="button"
                  onClick={clearLogo}
                  aria-label="លុប Logo"
                  className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-700 text-white ring-2 ring-ink-900" aria-hidden="true">
                    <X size={12} strokeWidth={3} />
                  </span>
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-sm font-bold">{displayName}</p>
              <p className="truncate text-meta text-ink-300">{address.trim() || storeAddress}</p>
              {(phone.trim() || storePhone) && <p className="truncate text-meta text-ink-300">📞 {phone.trim() || storePhone}</p>}
            </div>
            <a
              href="#store-info"
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 text-body-sm font-bold text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Pencil size={16} strokeWidth={2.25} aria-hidden="true" /> កែ
            </a>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-700 pt-3">
            <p className="text-meta text-ink-300">
              {storeLogo ? 'Logo ហាង' : 'បន្ថែម Logo ហាង'} · PNG · JPG · បង្ហាញក្នុង Receipt
            </p>
            <Button variant="onDark" icon={<Camera size={16} strokeWidth={2.25} />} onClick={() => fileRef.current?.click()}>
              {storeLogo ? 'ប្ដូររូប' : 'ជ្រើសរូប'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </section>

        {/* ══ Store identity fields ══════════════════════════ */}
        <section id="store-info" className="scroll-mt-4">
          <SectionHeader icon={<Info size={16} />} label="ព័ត៌មានហាង" />
          <div className="space-y-2">
            <Field label="ឈ្មោះហាង"   value={name}    onChange={setName}    placeholder="ហាងលក់ទំនិញ" />
            <Field label="អាសយដ្ឋាន"   value={address} onChange={setAddress} placeholder="ភ្នំពេញ · Cambodia" />
            <Field label="លេខទូរស័ព្ទ"  value={phone}   onChange={setPhone}   placeholder="012 345 678" inputMode="tel" />
          </div>
        </section>

        {/* ══ Exchange rate + cashier (filled tiles) ═════════ */}
        <section className="grid grid-cols-2 gap-2.5">
          <label className="flex min-h-[86px] flex-col justify-between rounded-lg bg-surface p-3.5 focus-within:ring-2 focus-within:ring-ink-900/20">
            <span className="flex items-center gap-1.5 text-meta font-semibold text-text-subtle">
              <Banknote size={16} aria-hidden="true" /> អត្រាប្ដូរ
            </span>
            <span className="flex items-baseline gap-1 text-body-sm font-semibold text-text-muted">
              $1 =
              <input
                type="number"
                inputMode="numeric"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                min="1"
                aria-label="អត្រាប្ដូរ ៛ ក្នុង $1"
                className="w-full min-w-0 bg-transparent text-title-sm font-bold tabular-nums text-text outline-none"
              />
              ៛
            </span>
          </label>
          <label className="flex min-h-[86px] flex-col justify-between rounded-lg bg-surface p-3.5 focus-within:ring-2 focus-within:ring-ink-900/20">
            <span className="flex items-center gap-1.5 text-meta font-semibold text-text-subtle">
              <User size={16} aria-hidden="true" /> អ្នកគិតលុយ
            </span>
            <input
              type="text"
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              placeholder="សុខា"
              aria-label="ឈ្មោះអ្នកគិតលុយ"
              className="w-full min-w-0 bg-transparent text-title-sm font-bold text-text outline-none placeholder:font-normal placeholder:text-text-muted"
            />
          </label>
          <p className="col-span-2 px-1 text-meta text-text-muted">
            💱 តម្លៃ​ទាំងអស់​បង្ហាញ​ទាំង ៛ និង $ — DB រក្សាទុក​ជា ៛ ប៉ុណ្ណោះ
          </p>
        </section>

        {/* ══ Receipt options ═══════════════════════════════ */}
        <section>
          <SectionHeader icon={<FileText size={16} />} label="បង្ហាញលើវិក្កយបត្រ" />
          <div className="overflow-hidden rounded-lg bg-surface">
            <div className="divide-y divide-line">
              <ToggleRow label="បង្ហាញ Logo"        value={receiptShowLogo}    onChange={(v) => update({ receiptShowLogo: v })} />
              <ToggleRow label="បង្ហាញ អាសយដ្ឋាន"   value={receiptShowAddress} onChange={(v) => update({ receiptShowAddress: v })} />
              <ToggleRow label="បង្ហាញ លេខទូរស័ព្ទ" value={receiptShowPhone}   onChange={(v) => update({ receiptShowPhone: v })} />
              <ToggleRow label="បង្ហាញ អ្នកគិតលុយ"   value={receiptShowCashier} onChange={(v) => update({ receiptShowCashier: v })} />
            </div>

            <div className="space-y-2 border-t border-line p-3">
              {/* Header note */}
              <label className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-bg px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
                <span className="text-caption font-semibold text-text-subtle">ចំណងជើងបន្ថែម (ក្រោមឈ្មោះហាង)</span>
                <input
                  type="text"
                  value={headerNote}
                  onChange={(e) => setHeaderNote(e.target.value)}
                  placeholder="ឧ. VATTIN: K001-... ឬ ពាក្យស្លោក"
                  className="w-full bg-transparent text-body text-text outline-none placeholder:text-text-muted"
                />
              </label>
              {/* Footer text */}
              <label className="flex flex-col rounded-[18px] bg-bg px-4 py-2 focus-within:ring-2 focus-within:ring-ink-900/20">
                <span className="text-caption font-semibold text-text-subtle">សារអរគុណ (footer)</span>
                <textarea
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="🙏 អរគុណដែលបានមកទិញ!"
                  rows={2}
                  className="w-full resize-none bg-transparent text-body text-text outline-none placeholder:text-text-muted"
                />
              </label>
            </div>

            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              aria-expanded={showPreview}
              className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink-900"
            >
              <span className="flex items-center gap-2 text-body-sm font-semibold text-text">
                <Receipt size={18} strokeWidth={2.25} aria-hidden="true" />
                {showPreview ? 'បិទ Preview Receipt' : 'មើល Preview Receipt'}
              </span>
              <ChevronRight
                size={18}
                className={cx('text-nav-off transition-transform', showPreview && 'rotate-90')}
                aria-hidden="true"
              />
            </button>

            {/* Receipt preview card */}
            {showPreview && (
              <div className="px-4 pb-4">
                <div className="space-y-1.5 rounded-md border border-line bg-surface-2 p-4 text-center font-mono">
                  {/* Logo / Store initial */}
                  {receiptShowLogo && (
                    storeLogo ? (
                      <img src={storeLogo} alt="logo" className="mx-auto mb-2 h-10 w-10 rounded-sm object-cover" />
                    ) : (
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900 text-body font-bold text-white">
                        {displayName.charAt(0) || 'ហ'}
                      </div>
                    )
                  )}
                  <p className="text-meta font-bold text-text">{displayName}</p>
                  {headerNote.trim() && (
                    <p className="text-caption font-medium text-text-subtle">{headerNote.trim()}</p>
                  )}
                  {receiptShowAddress && (address.trim() || storeAddress) && (
                    <p className="text-caption text-text-muted">{address.trim() || storeAddress}</p>
                  )}
                  {receiptShowPhone && (phone.trim() || storePhone) && (
                    <p className="text-caption text-text-muted">📞 {phone.trim() || storePhone}</p>
                  )}
                  <div className="my-2 border-t border-dashed border-line-strong" />
                  {/* Sample items */}
                  <div className="space-y-0.5 text-left">
                    <div className="flex justify-between text-caption text-text-subtle">
                      <span>ស្រូវបាយ × 2</span>
                      <span>{formatKHR(toKHR(5000))}</span>
                    </div>
                    <div className="flex justify-between text-caption text-text-subtle">
                      <span>មីហ្គីរូ × 3</span>
                      <span>{formatKHR(toKHR(4500))}</span>
                    </div>
                  </div>
                  <div className="my-1.5 border-t border-dashed border-line-strong" />
                  <div className="flex justify-between text-caption font-bold text-text">
                    <span>សរុប</span>
                    <span>{formatKHR(toKHR(9500))}</span>
                  </div>
                  <div className="my-1.5 border-t border-dashed border-line-strong" />
                  <p className="text-caption text-text-muted">
                    {footer.trim() || receiptFooter}
                  </p>
                  {receiptShowCashier && (
                    <p className="text-caption text-text-muted">
                      អ្នកគិតលុយ: {cashier.trim() || cashierName}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══ Save button ══════════════════════════════════ */}
        {(isDirty || saved) && (
          <Button
            variant={saved ? 'dark' : 'primary'}
            size="xl"
            fullWidth
            onClick={handleSave}
            icon={saved ? <Check size={20} strokeWidth={2.5} className="text-success-on-dark" /> : undefined}
          >
            {saved ? 'បានរក្សាទុករួចហើយ!' : 'រក្សាទុក'}
          </Button>
        )}

        {/* ══ Data tiles: backup · stock alert ═══════════════ */}
        <section className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShowBackup(true)}
            className="flex min-h-[112px] flex-col justify-between rounded-lg bg-surface p-3.5 text-left transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg text-ink-900" aria-hidden="true">
              <Database size={20} />
            </span>
            <span>
              <span className="block text-body-sm font-bold text-text">Backup / Restore</span>
              <span className="block text-caption text-text-muted">Export ឬ ផ្ទុកទិន្នន័យត្រឡប់ (.json)</span>
            </span>
          </button>
          <label className="flex min-h-[112px] flex-col justify-between rounded-lg bg-surface p-3.5 focus-within:ring-2 focus-within:ring-ink-900/20">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-warn-bg text-warn" aria-hidden="true">
              <Package size={20} />
            </span>
            <span>
              <span className="block text-caption font-semibold text-text-subtle">ជូនដំណឹងស្តុកតិចនៅ</span>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  min="1"
                  max="99"
                  aria-label="ជូនដំណឹងស្តុកតិចនៅ (ឯកតា)"
                  className="w-14 min-w-0 bg-transparent text-title-sm font-bold tabular-nums text-text outline-none"
                />
                <span className="text-meta text-text-muted">ឯកតា</span>
              </span>
            </span>
          </label>
          <p className="col-span-2 px-1 text-meta text-text-muted">
            ⚠️ នៅពេលស្តុកធ្លាក់ចុះទៅ {threshold || '5'} ឯកតា — ប្រព័ន្ធនឹងជូនដំណឹង
          </p>
        </section>

        {/* ══ Not available yet (no action) ══════════════════ */}
        <section>
          <SectionHeader icon={<Info size={16} />} label="ប្រព័ន្ធ" />
          <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface">
            <SoonRow label="គ្រប់គ្រងអ្នកប្រើ" sub="បន្ថែម ឬដកអ្នកប្រើប្រាស់" />
            <SoonRow label="ការជាវ SaaS"        sub="គ្រប់គ្រងផែនការ" />
          </div>
        </section>

        {/* ══ Danger zone ══════════════════════════════════ */}
        <section className="space-y-2">
          <SectionHeader icon={<ShieldAlert size={16} />} label="ផ្នែកគ្រោះថ្នាក់" danger />
          <Button variant="dangerSoft" size="lg" fullWidth icon={<Trash2 size={18} strokeWidth={2} />} onClick={() => setShowReset(true)}>
            លុបទិន្នន័យទាំងអស់
          </Button>
          <Button variant="secondary" size="lg" fullWidth icon={<LogOut size={18} strokeWidth={2} />} onClick={() => setShowSignOut(true)}>
            ចេញពីគណនី
          </Button>
        </section>

        {/* ══ App info ═════════════════════════════════════ */}
        <div className="space-y-1 pt-2 text-center">
          <p className="text-caption font-semibold text-text-muted">Rural POS v1.0.0</p>
          <p className="text-caption text-text-muted">Offline-first · IndexedDB · Next.js 15</p>
        </div>
      </div>

      {/* Backup / Restore sheet */}
      {showBackup && (
        <BackupSheet onClose={() => setShowBackup(false)} />
      )}

      {/* ── Reset data confirm ─────────────────────────────── */}
      <ConfirmDialog
        open={showReset}
        tone="danger"
        icon={<Trash2 size={26} strokeWidth={2} />}
        title="លុបទិន្នន័យទាំងអស់?"
        message={<>ទំនិញ · ការលក់ · បំណុល នឹងត្រូវលុបចេញ<br />ហើយដាក់ទិន្នន័យ demo ឡើងវិញ។<br />សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។</>}
        confirmLabel="បាទ/ចាស លុប"
        busy={resetting}
        busyLabel="កំពុងលុប…"
        onConfirm={handleResetData}
        onCancel={() => setShowReset(false)}
      />

      {/* ── Sign out confirm ───────────────────────────────── */}
      <ConfirmDialog
        open={showSignOut}
        tone="danger"
        icon={<LogOut size={26} strokeWidth={2} />}
        title="ចេញពីគណនី?"
        message={<>ទិន្នន័យ IndexedDB នៅ device នៅដដែល។<br />ចូលម្ដងទៀតដើម្បី sync ។</>}
        confirmLabel="បាទ/ចាស ចេញ"
        busy={signingOut}
        busyLabel="កំពុងចេញ…"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOut(false)}
      />
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */

function SectionHeader({
  icon, label, danger = false,
}: { icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <span className={danger ? 'text-danger' : 'text-text-muted'} aria-hidden="true">{icon}</span>
      <h2 className={cx('text-body-sm font-bold', danger ? 'text-danger' : 'text-text')}>
        {label}
      </h2>
    </div>
  )
}

function ToggleRow({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 pl-4 pr-2">
      <span className="text-body-sm font-medium text-text">{label}</span>
      <Toggle label={label} checked={value} onChange={onChange} />
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, inputMode = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="flex min-h-[54px] flex-col justify-center rounded-[18px] bg-surface px-4 py-1.5 focus-within:ring-2 focus-within:ring-ink-900/20">
      <span className="text-caption font-semibold text-text-subtle">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-body font-semibold text-text outline-none placeholder:font-normal placeholder:text-text-muted"
      />
    </label>
  )
}

/** A settings feature that has no action yet — not clickable, marked "ឆាប់ៗ". */
function SoonRow({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-text-subtle">{label}</p>
        {sub && <p className="text-meta text-text-muted">{sub}</p>}
      </div>
      <Pill variant="neutral">ឆាប់ៗ</Pill>
    </div>
  )
}
