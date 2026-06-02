'use client'

import { useRef, useState } from 'react'
import { X, Download, Upload, Database, CheckCircle2, AlertTriangle } from 'lucide-react'
import { backupService, type BackupFile, type BackupStats } from '@/services/backup.service'

interface Props {
  onClose: () => void
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'exported';  stats: BackupStats }
  | { kind: 'confirm';   backup: BackupFile; stats: BackupStats }
  | { kind: 'restored';  stats: BackupStats }
  | { kind: 'error';     message: string }

export function BackupSheet({ onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase,   setPhase]   = useState<Phase>({ kind: 'idle' })
  const [working, setWorking] = useState(false)

  /* ── Export ──────────────────────────────────────── */
  const handleExport = async () => {
    if (working) return
    setWorking(true)
    try {
      const stats = await backupService.downloadBackup()
      setPhase({ kind: 'exported', stats })
    } catch {
      setPhase({ kind: 'error', message: 'Export បរាជ័យ — សូមព្យាយាមម្ដងទៀត' })
    } finally {
      setWorking(false)
    }
  }

  /* ── Pick file → validate → confirm ──────────────── */
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setWorking(true)
    try {
      const backup = await backupService.readFile(file)
      const stats: BackupStats = {
        products:  backup.tables.products.length,
        customers: backup.tables.customers.length,
        sales:     backup.tables.sales.length,
        debts:     backup.tables.debtTransactions.length,
      }
      setPhase({ kind: 'confirm', backup, stats })
    } catch {
      setPhase({ kind: 'error', message: 'File មិនត្រឹមត្រូវ — សូមជ្រើស backup file ត្រឹមត្រូវ' })
    } finally {
      setWorking(false)
    }
  }

  /* ── Confirm restore ─────────────────────────────── */
  const handleRestore = async () => {
    if (phase.kind !== 'confirm' || working) return
    setWorking(true)
    try {
      const stats = await backupService.restore(phase.backup)
      setPhase({ kind: 'restored', stats })
      // Reload after a moment so live queries + zustand re-read fresh data
      setTimeout(() => window.location.reload(), 1800)
    } catch {
      setPhase({ kind: 'error', message: 'Restore បរាជ័យ — ទិន្នន័យមិនបានផ្លាស់ប្ដូរ' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/70"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database size={17} strokeWidth={2.25} className="text-primary-500" />
            <span className="text-[15px] font-bold text-slate-900">Backup / Restore</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* ── Confirm restore phase ──────────────────── */}
          {phase.kind === 'confirm' ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-danger-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-bold text-danger-800">ប្រុងប្រយ័ត្ន!</p>
                    <p className="text-[12px] text-danger-600 mt-1 leading-relaxed">
                      ការ Restore នឹង <span className="font-bold">លុបទិន្នន័យបច្ចុប្បន្នទាំងអស់</span> ហើយជំនួសដោយ backup file។ មិនអាចត្រឡប់វិញបានទេ។
                    </p>
                  </div>
                </div>
              </div>

              {/* What's in the backup */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">ទិន្នន័យក្នុង backup</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatPill label="ទំនិញ"   value={phase.stats.products} />
                  <StatPill label="អតិថិជន" value={phase.stats.customers} />
                  <StatPill label="ការលក់"  value={phase.stats.sales} />
                  <StatPill label="បំណុល"   value={phase.stats.debts} />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={working}
                  onClick={handleRestore}
                  className="flex-1 h-12 rounded-xl bg-danger-600 text-white font-bold text-[14px] disabled:opacity-50 active:bg-danger-700 transition-colors"
                >
                  {working ? 'កំពុង Restore…' : 'បាទ/ចាស Restore'}
                </button>
                <button
                  type="button"
                  onClick={() => setPhase({ kind: 'idle' })}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[14px] active:bg-slate-50 transition-colors"
                >
                  បោះបង់
                </button>
              </div>
            </div>

          /* ── Restored success ───────────────────────── */
          ) : phase.kind === 'restored' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                <CheckCircle2 size={36} strokeWidth={2} />
              </div>
              <p className="text-[16px] font-bold text-slate-900">Restore ជោគជ័យ!</p>
              <p className="text-[13px] text-slate-500">
                {phase.stats.products} ទំនិញ · {phase.stats.customers} អតិថិជន · {phase.stats.sales} ការលក់
              </p>
              <p className="text-[12px] text-slate-400">កំពុង reload…</p>
            </div>

          /* ── Default / exported / error ─────────────── */
          ) : (
            <>
              {/* Export */}
              <button
                type="button"
                disabled={working}
                onClick={handleExport}
                className="w-full rounded-2xl border border-success-200 bg-success-50 p-4 flex items-center gap-3 active:bg-success-100 transition-colors disabled:opacity-50"
              >
                <div className="w-11 h-11 rounded-xl bg-success-600 text-white flex items-center justify-center shrink-0">
                  <Download size={20} strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-bold text-slate-900">Export ទិន្នន័យ</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">ទាញយក backup file (.json) ទុកក្នុងទូរស័ព្ទ</p>
                </div>
              </button>

              {/* Export success */}
              {phase.kind === 'exported' && (
                <div className="rounded-xl bg-success-50 border border-success-200 px-4 py-3 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-success-600 shrink-0" />
                  <p className="text-[12px] text-success-700 font-medium">
                    Backup ទាញយកជោគជ័យ! {phase.stats.products} ទំនិញ · {phase.stats.sales} ការលក់
                  </p>
                </div>
              )}

              {/* Import */}
              <button
                type="button"
                disabled={working}
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border border-primary-200 bg-primary-50 p-4 flex items-center gap-3 active:bg-primary-100 transition-colors disabled:opacity-50"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
                  <Upload size={20} strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-bold text-slate-900">Restore ទិន្នន័យ</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">ផ្ទុក backup file ត្រឡប់ (លុបទិន្នន័យចាស់)</p>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFilePick}
              />

              {/* Error */}
              {phase.kind === 'error' && (
                <div className="rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-danger-600 shrink-0" />
                  <p className="text-[12px] text-danger-700 font-medium">{phase.message}</p>
                </div>
              )}

              {/* Tip */}
              <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 leading-relaxed">
                💡 Export ទុក backup ជារៀងរាល់ថ្ងៃ → ផ្ញើ Telegram ខ្លួនឯង ឬ save Google Drive ដើម្បីការពារទិន្នន័យបាត់។
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[14px] font-bold text-slate-800 tabular-nums">{value}</span>
    </div>
  )
}
