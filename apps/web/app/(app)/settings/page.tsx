'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, X, Store, User, FileText, Check,
  Package, ChevronRight, Info, ShieldAlert, Receipt, Database,
  LogOut, Loader2, Trash2,
} from 'lucide-react'
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
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <h1 className="text-[19px] font-bold text-slate-900">ការកំណត់</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">
          កំណត់ព័ត៌មានហាង និងមុខងារ
        </p>
      </header>

      {/* ── Scrollable body ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-8 space-y-4 max-w-xl mx-auto">

          {/* ══ Store identity ═══════════════════════════════ */}
          <section>
            <SectionHeader icon={<Store size={14} />} label="ព័ត៌មានហាង" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">

              {/* Logo row */}
              <div className="px-4 pt-4 pb-4 flex items-center gap-4 border-b border-slate-100">
                <div className="relative shrink-0">
                  {storeLogo ? (
                    <img
                      src={storeLogo}
                      alt="logo"
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-card"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white text-[22px] font-bold flex items-center justify-center shadow-card">
                      {displayName.charAt(0) || 'ហ'}
                    </div>
                  )}
                  {storeLogo && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="min-h-0 min-w-0 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center shadow"
                    >
                      <X size={11} strokeWidth={3} />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">
                    {storeLogo ? 'Logo ហាង' : 'បន្ថែម Logo ហាង'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    PNG · JPG · បង្ហាញក្នុង Receipt
                  </p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-[12px] font-semibold active:bg-slate-100 min-h-0 min-w-0"
                  >
                    <Camera size={13} strokeWidth={2.25} />
                    {storeLogo ? 'ប្ដូររូប' : 'ជ្រើសរូប'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>

              {/* Fields */}
              <div className="divide-y divide-slate-100">
                <Field label="ឈ្មោះហាង"   value={name}    onChange={setName}    placeholder="ហាងលក់ទំនិញ" />
                <Field label="អាសយដ្ឋាន"   value={address} onChange={setAddress} placeholder="ភ្នំពេញ · Cambodia" />
                <Field label="លេខទូរស័ព្ទ"  value={phone}   onChange={setPhone}   placeholder="012 345 678" inputMode="tel" />
              </div>
            </div>
          </section>

          {/* ══ Cashier ══════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<User size={14} />} label="អ្នកគិតលុយ" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <Field label="ឈ្មោះ" value={cashier} onChange={setCashier} placeholder="សុខា" />
            </div>
          </section>

          {/* ══ Currency / exchange rate ═════════════════════ */}
          <section>
            <SectionHeader icon={<span className="text-[13px] leading-none">💵</span>} label="រូបិយប័ណ្ណ" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-[12px] text-slate-400 shrink-0 leading-snug">
                  អត្រាប្ដូរ · $1 =
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    min="1"
                    className="w-24 h-9 rounded-lg border border-slate-200 text-center text-[15px] font-bold text-slate-900 focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-[13px] text-slate-500 font-medium">៛</span>
                </div>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💱 តម្លៃ​ទាំងអស់​បង្ហាញ​ទាំង ៛ និង $ — DB រក្សាទុក​ជា ៛ ប៉ុណ្ណោះ
                </p>
              </div>
            </div>
          </section>

          {/* ══ Low stock threshold ══════════════════════════ */}
          <section>
            <SectionHeader icon={<Package size={14} />} label="ស្តុក" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-[12px] text-slate-400 shrink-0 w-36 leading-snug">
                  ជូនដំណឹងស្តុកតិចនៅ
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    min="1"
                    max="99"
                    className="w-14 h-9 rounded-lg border border-slate-200 text-center text-[15px] font-bold text-slate-900 focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-[13px] text-slate-500 font-medium">ឯកតា</span>
                </div>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ⚠️ នៅពេលស្តុកធ្លាក់ចុះទៅ {threshold || '5'} ឯកតា — ប្រព័ន្ធនឹងជូនដំណឹង
                </p>
              </div>
            </div>
          </section>

          {/* ══ Receipt Footer + Preview ══════════════════════ */}
          <section>
            <SectionHeader icon={<FileText size={14} />} label="វិក្កយបត្រ" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              {/* Header note */}
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-[12px] text-slate-400 block mb-1.5">ចំណងជើងបន្ថែម (ក្រោមឈ្មោះហាង)</span>
                <input
                  type="text"
                  value={headerNote}
                  onChange={(e) => setHeaderNote(e.target.value)}
                  placeholder="ឧ. VATTIN: K001-... ឬ ពាក្យស្លោក"
                  className="w-full text-[14px] font-medium text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300"
                />
              </div>

              {/* Toggles */}
              <ToggleRow label="បង្ហាញ Logo"        value={receiptShowLogo}    onChange={(v) => update({ receiptShowLogo: v })} />
              <ToggleRow label="បង្ហាញ អាសយដ្ឋាន"   value={receiptShowAddress} onChange={(v) => update({ receiptShowAddress: v })} />
              <ToggleRow label="បង្ហាញ លេខទូរស័ព្ទ" value={receiptShowPhone}   onChange={(v) => update({ receiptShowPhone: v })} />
              <ToggleRow label="បង្ហាញ អ្នកគិតលុយ"   value={receiptShowCashier} onChange={(v) => update({ receiptShowCashier: v })} />

              {/* Footer text */}
              <div className="px-4 py-3 border-y border-slate-100">
                <span className="text-[12px] text-slate-400 block mb-1.5">សារអរគុណ (footer)</span>
                <textarea
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="🙏 អរគុណដែលបានមកទិញ!"
                  rows={2}
                  className="w-full text-[14px] font-medium text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 resize-none leading-relaxed"
                />
              </div>

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-slate-50 min-h-0 min-w-0 transition-colors"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-primary-600">
                  <Receipt size={14} strokeWidth={2.25} />
                  {showPreview ? 'បិទ Preview Receipt' : 'មើល Preview Receipt'}
                </span>
                <ChevronRight
                  size={15}
                  className={['text-slate-300 transition-transform', showPreview ? 'rotate-90' : ''].join(' ')}
                />
              </button>

              {/* Receipt preview card */}
              {showPreview && (
                <div className="px-4 pb-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-center space-y-1.5">
                    {/* Logo / Store initial */}
                    {receiptShowLogo && (
                      storeLogo ? (
                        <img src={storeLogo} alt="logo" className="w-10 h-10 rounded-lg object-cover mx-auto mb-2" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary-600 text-white text-[16px] font-bold flex items-center justify-center mx-auto mb-2">
                          {displayName.charAt(0) || 'ហ'}
                        </div>
                      )
                    )}
                    <p className="text-[13px] font-bold text-slate-900">{displayName}</p>
                    {headerNote.trim() && (
                      <p className="text-[10px] font-medium text-slate-600">{headerNote.trim()}</p>
                    )}
                    {receiptShowAddress && (address.trim() || storeAddress) && (
                      <p className="text-[10px] text-slate-500">{address.trim() || storeAddress}</p>
                    )}
                    {receiptShowPhone && (phone.trim() || storePhone) && (
                      <p className="text-[10px] text-slate-500">📞 {phone.trim() || storePhone}</p>
                    )}
                    <div className="border-t border-dashed border-slate-300 my-2" />
                    {/* Sample items */}
                    <div className="text-left space-y-0.5">
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>ស្រូវបាយ × 2</span>
                        <span>{formatKHR(toKHR(5000))}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>មីហ្គីរូ × 3</span>
                        <span>{formatKHR(toKHR(4500))}</span>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-slate-300 my-1.5" />
                    <div className="flex justify-between text-[11px] font-bold text-slate-900">
                      <span>សរុប</span>
                      <span>{formatKHR(toKHR(9500))}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-300 my-1.5" />
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {footer.trim() || receiptFooter}
                    </p>
                    {receiptShowCashier && (
                      <p className="text-[10px] text-slate-400">
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
            <button
              type="button"
              onClick={handleSave}
              className={[
                'w-full h-14 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2',
                'transition-all active:scale-[0.99]',
                saved
                  ? 'bg-success-600 text-white'
                  : 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 active:bg-primary-700',
              ].join(' ')}
            >
              {saved ? (
                <><Check size={20} strokeWidth={2.5} /> បានរក្សាទុករួចហើយ!</>
              ) : (
                'រក្សាទុក'
              )}
            </button>
          )}

          {/* ══ Data / Backup ════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Database size={14} />} label="ទិន្នន័យ" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
              <SettingRow
                label="Backup / Restore"
                sub="Export ឬ ផ្ទុកទិន្នន័យត្រឡប់ (.json)"
                onClick={() => setShowBackup(true)}
              />
            </div>
          </section>

          {/* ══ Other / System ═══════════════════════════════ */}
          <section>
            <SectionHeader icon={<Info size={14} />} label="ប្រព័ន្ធ" />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
              <SettingRow label="គ្រប់គ្រងអ្នកប្រើ"  sub="បន្ថែម ឬដកអ្នកប្រើប្រាស់" />
              <SettingRow label="ការជាវ SaaS"         sub="គ្រប់គ្រងផែនការ"           />
            </div>
          </section>

          {/* ══ Danger zone ══════════════════════════════════ */}
          <section>
            <SectionHeader icon={<ShieldAlert size={14} />} label="ផ្នែកគ្រោះថ្នាក់" danger />
            <div className="bg-white rounded-2xl border border-danger-100 shadow-card divide-y divide-slate-100 overflow-hidden">
              <SettingRow
                label="លុបទិន្នន័យទាំងអស់"
                sub="Reset ទំនិញ · ការលក់ · បំណុល"
                icon={<Trash2 size={15} strokeWidth={2} />}
                onClick={() => setShowReset(true)}
                danger
              />
              <SettingRow
                label="ចេញពីគណនី"
                sub="ចេញចោល session នៅ device នេះ"
                icon={<LogOut size={15} strokeWidth={2} />}
                onClick={() => setShowSignOut(true)}
                danger
              />
            </div>
          </section>

          {/* ══ App info ═════════════════════════════════════ */}
          <div className="text-center space-y-1 pt-2 pb-4">
            <p className="text-[12px] font-semibold text-slate-400">Rural POS v1.0.0</p>
            <p className="text-[11px] text-slate-300">Offline-first · IndexedDB · Next.js 15</p>
          </div>

        </div>
      </div>

      {/* Backup / Restore sheet */}
      {showBackup && (
        <BackupSheet onClose={() => setShowBackup(false)} />
      )}

      {/* ── Reset data confirm dialog ────────────────────────── */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60"
          onClick={() => !resetting && setShowReset(false)}
        >
          <div
            className="w-full md:max-w-sm bg-white rounded-t-2xl md:rounded-2xl shadow-pop animate-sheet-up px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + title */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-full bg-danger-50 flex items-center justify-center">
                <Trash2 size={26} className="text-danger-500" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-slate-900">លុបទិន្នន័យទាំងអស់?</p>
                <p className="text-[13px] text-slate-400 mt-1 leading-snug">
                  ទំនិញ · ការលក់ · បំណុល នឹងត្រូវលុបចេញ<br />
                  ហើយដាក់ទិន្នន័យ demo ឡើងវិញ។<br />
                  សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={handleResetData}
                disabled={resetting}
                className="w-full h-13 rounded-xl bg-danger-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 active:bg-danger-700 disabled:opacity-60 transition-colors"
              >
                {resetting
                  ? <><Loader2 size={18} className="animate-spin" /> កំពុងលុប…</>
                  : <><Trash2 size={18} strokeWidth={2.25} /> បាទ/ចាស លុប</>
                }
              </button>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                disabled={resetting}
                className="w-full h-12 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[14px] active:bg-slate-50 transition-colors"
              >
                បោះបង់
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out confirm dialog ──────────────────────────── */}
      {showSignOut && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60"
          onClick={() => !signingOut && setShowSignOut(false)}
        >
          <div
            className="w-full md:max-w-sm bg-white rounded-t-2xl md:rounded-2xl shadow-pop animate-sheet-up px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + title */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-full bg-danger-50 flex items-center justify-center">
                <LogOut size={26} className="text-danger-500" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-slate-900">ចេញពីគណនី?</p>
                <p className="text-[13px] text-slate-400 mt-1 leading-snug">
                  ទិន្នន័យ IndexedDB នៅ device នៅដដែល។<br />
                  ចូលម្ដងទៀតដើម្បី sync ។
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full h-13 rounded-xl bg-danger-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 active:bg-danger-700 disabled:opacity-60 transition-colors"
              >
                {signingOut
                  ? <><Loader2 size={18} className="animate-spin" /> កំពុងចេញ…</>
                  : <><LogOut size={18} strokeWidth={2.25} /> បាទ/ចាស ចេញ</>
                }
              </button>
              <button
                type="button"
                onClick={() => setShowSignOut(false)}
                disabled={signingOut}
                className="w-full h-12 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[14px] active:bg-slate-50 transition-colors"
              >
                បោះបង់
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */

function SectionHeader({
  icon, label, danger = false,
}: { icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <span className={danger ? 'text-danger-400' : 'text-slate-400'}>{icon}</span>
      <h2 className={[
        'text-[11px] font-bold uppercase tracking-wider',
        danger ? 'text-danger-400' : 'text-slate-400',
      ].join(' ')}>
        {label}
      </h2>
    </div>
  )
}

function ToggleRow({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <span className="text-[14px] font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          'relative min-h-0 min-w-0 w-12 h-7 rounded-full transition-colors shrink-0 flex items-center px-0.5',
          value ? 'bg-success-500' : 'bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200',
            value ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
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
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-[12px] text-slate-400 shrink-0 w-28">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-[14px] font-medium text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 min-w-0"
      />
    </div>
  )
}

function SettingRow({
  label, sub, danger = false, onClick, icon,
}: { label: string; sub?: string; danger?: boolean; onClick?: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-slate-50 min-h-0 min-w-0 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className={danger ? 'text-danger-500' : 'text-slate-400'}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className={[
            'text-[14px] font-medium',
            danger ? 'text-danger-600' : 'text-slate-800',
          ].join(' ')}>{label}</p>
          {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </button>
  )
}
