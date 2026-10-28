import Dexie, { type Table } from 'dexie'
import { db } from '@/db'

/* v1: IndexedDB tables + store profile.
   v2: + held invoices, categories, units (B34). Older files still restore. */
export const BACKUP_VERSION = 2

/* zustand-persisted settings that travel with a backup (raw localStorage JSON) */
const SETTINGS_KEYS = {
  profile:    'pos-store-profile',
  categories: 'pos-categories',
  units:      'pos-units',
} as const
const LAST_BACKUP_KEY = 'pos-last-backup-at'

/** How many days without a backup before the app reminds the shop */
export const BACKUP_REMINDER_DAYS = 7

export interface BackupFile {
  version:    number
  exportedAt: string
  appName:    string
  profile:    unknown            // zustand-persisted store profile (raw)
  /** v2+: other persisted settings (raw zustand JSON) */
  settings?: {
    categories: unknown
    units:      unknown
  }
  tables: {
    products:         unknown[]
    customers:        unknown[]
    sales:            unknown[]
    saleItems:        unknown[]
    debtTransactions: unknown[]
    cashDrawers:      unknown[]
    stockMovements:   unknown[]
    expenses:         unknown[]
    /** v2+ */
    heldInvoices?:    unknown[]
  }
}

export interface BackupStats {
  products:  number
  customers: number
  sales:     number
  debts:     number
}

export class BackupError extends Error {
  constructor(public readonly code: 'INVALID_BACKUP' | 'BACKUP_TOO_NEW') {
    super(code)
  }
}

/* The data as it was right before the last restore, so a wrong restore can be
   undone. Kept in its own IndexedDB database — never mixed with shop data. */
interface Snapshot { id: 'before-restore'; takenAt: string; backup: BackupFile }
class SnapshotDb extends Dexie {
  snapshots!: Table<Snapshot>
  constructor() {
    super('pos-snapshots')
    this.version(1).stores({ snapshots: 'id' })
  }
}
let snapshotDb: SnapshotDb | null = null
const snapshots = () => (snapshotDb ??= new SnapshotDb()).snapshots

const DATA_TABLES = () => [
  db.products, db.customers, db.sales, db.saleItems, db.debtTransactions,
  db.cashDrawers, db.stockMovements, db.expenses, db.heldInvoices,
]

function readSetting(key: string): unknown {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSetting(key: string, value: unknown): void {
  try {
    if (value != null && typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore — e.g. storage full */ }
}

function statsOf(backup: BackupFile): BackupStats {
  return {
    products:  backup.tables.products.length,
    customers: backup.tables.customers.length,
    sales:     backup.tables.sales.length,
    debts:     backup.tables.debtTransactions.length,
  }
}

export const backupService = {

  /* ── Export everything → BackupFile object ───────────────── */
  async exportAll(): Promise<BackupFile> {
    const [
      products, customers, sales, saleItems,
      debtTransactions, cashDrawers, stockMovements, expenses, heldInvoices,
    ] = await Promise.all(DATA_TABLES().map((t) => t.toArray()))

    return {
      version:    BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appName:    'Rural POS System',
      profile:    readSetting(SETTINGS_KEYS.profile),
      settings: {
        categories: readSetting(SETTINGS_KEYS.categories),
        units:      readSetting(SETTINGS_KEYS.units),
      },
      tables: {
        products: products!, customers: customers!, sales: sales!, saleItems: saleItems!,
        debtTransactions: debtTransactions!, cashDrawers: cashDrawers!,
        stockMovements: stockMovements!, expenses: expenses!, heldInvoices: heldInvoices!,
      },
    }
  },

  stats: statsOf,

  /* ── Trigger a file download of the backup ───────────────── */
  async downloadBackup(): Promise<BackupStats> {
    const data = await this.exportAll()
    const json = JSON.stringify(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)

    const date = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = url
    a.download = `rural-pos-backup-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    this.markBackedUp()
    return statsOf(data)
  },

  /* ── Validate a parsed backup object ─────────────────────── */
  validate(obj: unknown): obj is BackupFile {
    if (!obj || typeof obj !== 'object') return false
    const b = obj as Partial<BackupFile>
    return (
      typeof b.version === 'number' &&
      !!b.tables &&
      Array.isArray(b.tables.products) &&
      Array.isArray(b.tables.customers) &&
      Array.isArray(b.tables.sales) &&
      Array.isArray(b.tables.saleItems) &&
      Array.isArray(b.tables.debtTransactions)
    )
  },

  /** Throws BackupError unless this app version can restore the file */
  check(obj: unknown): BackupFile {
    if (!this.validate(obj)) throw new BackupError('INVALID_BACKUP')
    if (obj.version > BACKUP_VERSION) throw new BackupError('BACKUP_TOO_NEW')
    return obj
  },

  /* ── Restore — REPLACES all current data ─────────────────────
     The current data is saved first, so undoLastRestore() can bring it back. */
  async restore(backup: BackupFile): Promise<BackupStats> {
    this.check(backup)
    const before = await this.exportAll()
    await snapshots().put({ id: 'before-restore', takenAt: before.exportedAt, backup: before })
    await this.replaceAll(backup)
    return statsOf(backup)
  },

  /** When the data was saved before the last restore (null = nothing to undo) */
  async lastRestoreSnapshotAt(): Promise<string | null> {
    return (await snapshots().get('before-restore'))?.takenAt ?? null
  },

  /** Put back the data exactly as it was before the last restore */
  async undoLastRestore(): Promise<BackupStats | null> {
    const snap = await snapshots().get('before-restore')
    if (!snap) return null
    await this.replaceAll(snap.backup)
    await snapshots().delete('before-restore')
    return statsOf(snap.backup)
  },

  async replaceAll(backup: BackupFile): Promise<void> {
    const t = backup.tables
    await db.transaction('rw', DATA_TABLES(), async () => {
      await Promise.all(DATA_TABLES().map((table) => table.clear()))
      await db.products.bulkAdd(t.products as never[])
      await db.customers.bulkAdd(t.customers as never[])
      await db.sales.bulkAdd(t.sales as never[])
      await db.saleItems.bulkAdd(t.saleItems as never[])
      await db.debtTransactions.bulkAdd(t.debtTransactions as never[])
      await db.cashDrawers.bulkAdd((t.cashDrawers ?? []) as never[])
      await db.stockMovements.bulkAdd((t.stockMovements ?? []) as never[])
      await db.expenses.bulkAdd((t.expenses ?? []) as never[])
      await db.heldInvoices.bulkAdd((t.heldInvoices ?? []) as never[])
    })

    // Settings (best-effort). A v1 file has no categories/units: keep current ones.
    writeSetting(SETTINGS_KEYS.profile, backup.profile)
    writeSetting(SETTINGS_KEYS.categories, backup.settings?.categories)
    writeSetting(SETTINGS_KEYS.units, backup.settings?.units)
  },

  /* ── Wipe every table (factory reset) ────────────────────── */
  async clearAll(): Promise<void> {
    await db.transaction('rw', [...DATA_TABLES(), db.syncQueue], async () => {
      await Promise.all([...DATA_TABLES(), db.syncQueue].map((t) => t.clear()))
    })
  },

  /* ── Read a File → parsed + checked BackupFile ───────────── */
  async readFile(file: File): Promise<BackupFile> {
    let obj: unknown
    try {
      obj = JSON.parse(await file.text())
    } catch {
      throw new BackupError('INVALID_BACKUP')
    }
    return this.check(obj)
  },

  /* ── Backup reminder ─────────────────────────────────────── */
  markBackedUp(at: Date = new Date()): void {
    try { localStorage.setItem(LAST_BACKUP_KEY, at.toISOString()) } catch { /* ignore */ }
  },

  lastBackupAt(): string | null {
    try { return localStorage.getItem(LAST_BACKUP_KEY) } catch { return null }
  },

  /** Whole days since the last backup (null = never backed up on this device) */
  daysSinceBackup(now: Date = new Date()): number | null {
    const last = this.lastBackupAt()
    if (!last) return null
    return Math.floor((now.getTime() - new Date(last).getTime()) / 86_400_000)
  },
}
