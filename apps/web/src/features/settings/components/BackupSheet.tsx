'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Upload, CheckCircle2, AlertTriangle, Lightbulb, Undo2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { backupService, BackupError, type BackupFile, type BackupStats } from '@/services/backup.service'

interface Props {
  onClose: () => void
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'exported';  stats: BackupStats }
  | { kind: 'confirm';   backup: BackupFile; stats: BackupStats }
  | { kind: 'restored';  stats: BackupStats; undone?: boolean }
  | { kind: 'error';     message: string }

export function BackupSheet({ onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase,   setPhase]   = useState<Phase>({ kind: 'idle' })
  const [working, setWorking] = useState(false)
  /* When the data was saved right before the last restore (null = nothing to undo) */
  const [undoAt,  setUndoAt]  = useState<string | null>(null)
  const [lastAt,  setLastAt]  = useState<string | null>(null)

  useEffect(() => {
    setLastAt(backupService.lastBackupAt())
    backupService.lastRestoreSnapshotAt().then(setUndoAt).catch(() => {})
  }, [])

  /* ── Export ──────────────────────────────────────── */
  const handleExport = async () => {
    if (working) return
    setWorking(true)
    try {
      const stats = await backupService.downloadBackup()
      setLastAt(backupService.lastBackupAt())
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
      setPhase({ kind: 'confirm', backup, stats: backupService.stats(backup) })
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof BackupError && err.code === 'BACKUP_TOO_NEW'
          ? 'Backup នេះមកពី app ជំនាន់ថ្មីជាង — សូមបើក app ឡើងវិញ (reload) ដើម្បីទទួលបានជំនាន់ថ្មី រួចសាកម្ដងទៀត'
          : 'File មិនត្រឹមត្រូវ — សូមជ្រើស backup file ត្រឹមត្រូវ',
      })
    } finally {
      setWorking(false)
    }
  }

  /* ── Undo the last restore ───────────────────────── */
  const handleUndo = async () => {
    if (working) return
    setWorking(true)
    try {
      const stats = await backupService.undoLastRestore()
      if (!stats) return
      setPhase({ kind: 'restored', stats, undone: true })
      setTimeout(() => window.location.reload(), 1800)
    } catch {
      setPhase({ kind: 'error', message: 'ត្រឡប់ទិន្នន័យមិនបាន — ទិន្នន័យមិនបានផ្លាស់ប្ដូរ' })
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
    <Sheet open onClose={onClose} title="Backup / Restore">
      <div className="space-y-3 pt-1 pb-2">

        {/* ── Confirm restore phase ──────────────────── */}
        {phase.kind === 'confirm' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-danger-bg p-4">
              <AlertTriangle size={22} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="text-body font-bold text-danger">ប្រុងប្រយ័ត្ន!</p>
                <p className="mt-1 text-body-sm text-danger">
                  ការ Restore នឹង <span className="font-bold">ជំនួសទិន្នន័យបច្ចុប្បន្នទាំងអស់</span> ដោយ backup file។
                  App រក្សាទុកទិន្នន័យបច្ចុប្បន្នមួយច្បាប់ជាមុន ដូច្នេះអាចត្រឡប់វិញបាន។
                </p>
              </div>
            </div>

            {/* What's in the backup */}
            <div className="rounded-lg bg-surface-2 p-3">
              <p className="mb-2 text-meta font-semibold text-text-subtle">ទិន្នន័យក្នុង backup</p>
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
                className="h-14 flex-1 rounded-md bg-danger text-body font-bold text-white active:brightness-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                {working ? 'កំពុង Restore…' : 'បាទ/ចាស Restore'}
              </button>
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setPhase({ kind: 'idle' })}>
                បោះបង់
              </Button>
            </div>
          </div>

        /* ── Restored success ───────────────────────── */
        ) : phase.kind === 'restored' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center" role="status">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success" aria-hidden="true">
              <CheckCircle2 size={36} strokeWidth={2} />
            </div>
            <p className="text-title-sm font-bold text-text">{phase.undone ? 'បានត្រឡប់ទិន្នន័យមុនវិញ!' : 'Restore ជោគជ័យ!'}</p>
            <p className="text-meta text-text-muted">
              {phase.stats.products} ទំនិញ · {phase.stats.customers} អតិថិជន · {phase.stats.sales} ការលក់
            </p>
            <p className="text-meta text-text-muted">កំពុង reload…</p>
          </div>

        /* ── Default / exported / error ─────────────── */
        ) : (
          <>
            {/* Export */}
            <button
              type="button"
              disabled={working}
              onClick={handleExport}
              className="flex w-full items-center gap-3 rounded-lg bg-surface-2 p-4 text-left transition-colors active:bg-line disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-ink-900" aria-hidden="true">
                <Download size={22} strokeWidth={2} />
              </span>
              <span className="flex-1">
                <span className="block text-body font-bold text-text">Export ទិន្នន័យ</span>
                <span className="mt-0.5 block text-meta text-text-muted">ទាញយក backup file (.json) ទុកក្នុងទូរស័ព្ទ</span>
              </span>
            </button>

            <p className="px-1 text-meta text-text-muted">
              Backup ចុងក្រោយ: <span className="font-semibold text-text">{lastBackupLabel(lastAt)}</span>
            </p>

            {/* Export success */}
            {phase.kind === 'exported' && (
              <div className="flex items-center gap-2.5 rounded-md bg-success-bg px-4 py-3" role="status">
                <CheckCircle2 size={18} className="shrink-0 text-success" aria-hidden="true" />
                <p className="text-body-sm font-semibold text-success">
                  Backup ទាញយកជោគជ័យ! {phase.stats.products} ទំនិញ · {phase.stats.sales} ការលក់
                </p>
              </div>
            )}

            {/* Import */}
            <button
              type="button"
              disabled={working}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg bg-surface-2 p-4 text-left transition-colors active:bg-line disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-ink-900 text-white" aria-hidden="true">
                <Upload size={22} strokeWidth={2} />
              </span>
              <span className="flex-1">
                <span className="block text-body font-bold text-text">Restore ទិន្នន័យ</span>
                <span className="mt-0.5 block text-meta text-text-muted">ផ្ទុក backup file ត្រឡប់ (លុបទិន្នន័យចាស់)</span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFilePick}
            />

            {/* Undo the last restore */}
            {undoAt && (
              <button
                type="button"
                disabled={working}
                onClick={handleUndo}
                className="flex w-full items-center gap-3 rounded-lg border border-line p-4 text-left transition-colors active:bg-surface-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-900" aria-hidden="true">
                  <Undo2 size={22} strokeWidth={2} />
                </span>
                <span className="flex-1">
                  <span className="block text-body font-bold text-text">ត្រឡប់ទិន្នន័យមុន Restore</span>
                  <span className="mt-0.5 block text-meta text-text-muted">ទិន្នន័យដែលមាននៅ {formatWhen(undoAt)}</span>
                </span>
              </button>
            )}

            {/* Error */}
            {phase.kind === 'error' && (
              <div className="flex items-center gap-2.5 rounded-md bg-danger-bg px-4 py-3" role="alert">
                <AlertTriangle size={18} className="shrink-0 text-danger" aria-hidden="true" />
                <p className="text-body-sm font-semibold text-danger">{phase.message}</p>
              </div>
            )}

            {/* Tip */}
            <p className="flex items-start gap-2 rounded-md bg-surface-2 px-3.5 py-3 text-meta text-text-muted">
              <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Export backup យ៉ាងហោចណាស់ម្ដងក្នុងមួយសប្ដាហ៍ → ផ្ញើ Telegram ខ្លួនឯង ឬ save Google Drive។ បើទូរស័ព្ទបាត់ ឬខូច នេះជាផ្លូវតែមួយគត់ដើម្បីយកទិន្នន័យមកវិញ។</span>
            </p>
          </>
        )}
      </div>
    </Sheet>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-sm bg-surface px-3 py-2">
      <span className="text-meta text-text-muted">{label}</span>
      <span className="text-body-sm font-bold tabular-nums text-text">{value}</span>
    </div>
  )
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ម៉ោង ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function lastBackupLabel(iso: string | null): string {
  if (!iso) return 'មិនទាន់ធ្វើ'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'ថ្ងៃនេះ' : `${days} ថ្ងៃមុន`
}
