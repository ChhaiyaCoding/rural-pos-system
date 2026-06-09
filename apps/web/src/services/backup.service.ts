import { db } from '@/db'

const BACKUP_VERSION = 1
const PROFILE_KEY    = 'pos-store-profile'

export interface BackupFile {
  version:    number
  exportedAt: string
  appName:    string
  profile:    unknown            // zustand-persisted store profile (raw)
  tables: {
    products:         unknown[]
    customers:        unknown[]
    sales:            unknown[]
    saleItems:        unknown[]
    debtTransactions: unknown[]
    cashDrawers:      unknown[]
    stockMovements:   unknown[]
    expenses:         unknown[]
  }
}

export interface BackupStats {
  products:  number
  customers: number
  sales:     number
  debts:     number
}

export const backupService = {

  /* ── Export everything → BackupFile object ───────────────── */
  async exportAll(): Promise<BackupFile> {
    const [
      products, customers, sales, saleItems,
      debtTransactions, cashDrawers, stockMovements, expenses,
    ] = await Promise.all([
      db.products.toArray(),
      db.customers.toArray(),
      db.sales.toArray(),
      db.saleItems.toArray(),
      db.debtTransactions.toArray(),
      db.cashDrawers.toArray(),
      db.stockMovements.toArray(),
      db.expenses.toArray(),
    ])

    let profile: unknown = null
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_KEY) : null
      profile = raw ? JSON.parse(raw) : null
    } catch { /* ignore */ }

    return {
      version:    BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appName:    'Rural POS System',
      profile,
      tables: {
        products, customers, sales, saleItems,
        debtTransactions, cashDrawers, stockMovements, expenses,
      },
    }
  },

  /* ── Trigger a file download of the backup ───────────────── */
  async downloadBackup(): Promise<BackupStats> {
    const data = await this.exportAll()
    const json = JSON.stringify(data, null, 2)
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

    return {
      products:  data.tables.products.length,
      customers: data.tables.customers.length,
      sales:     data.tables.sales.length,
      debts:     data.tables.debtTransactions.length,
    }
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
      Array.isArray(b.tables.sales)
    )
  },

  /* ── Restore — REPLACES all current data ─────────────────── */
  async restore(backup: BackupFile): Promise<BackupStats> {
    const t = backup.tables

    await db.transaction(
      'rw',
      [db.products, db.customers, db.sales, db.saleItems,
       db.debtTransactions, db.cashDrawers, db.stockMovements, db.expenses],
      async () => {
        // Clear current data
        await Promise.all([
          db.products.clear(),
          db.customers.clear(),
          db.sales.clear(),
          db.saleItems.clear(),
          db.debtTransactions.clear(),
          db.cashDrawers.clear(),
          db.stockMovements.clear(),
          db.expenses.clear(),
        ])
        // Bulk-insert from backup
        await db.products.bulkAdd(t.products as never[])
        await db.customers.bulkAdd(t.customers as never[])
        await db.sales.bulkAdd(t.sales as never[])
        await db.saleItems.bulkAdd(t.saleItems as never[])
        await db.debtTransactions.bulkAdd(t.debtTransactions as never[])
        await db.cashDrawers.bulkAdd((t.cashDrawers ?? []) as never[])
        await db.stockMovements.bulkAdd((t.stockMovements ?? []) as never[])
        await db.expenses.bulkAdd((t.expenses ?? []) as never[])
      }
    )

    // Restore store profile (best-effort)
    try {
      if (backup.profile && typeof window !== 'undefined') {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(backup.profile))
      }
    } catch { /* ignore */ }

    return {
      products:  t.products.length,
      customers: t.customers.length,
      sales:     t.sales.length,
      debts:     t.debtTransactions.length,
    }
  },

  /* ── Wipe every table (factory reset) ────────────────────── */
  async clearAll(): Promise<void> {
    await db.transaction(
      'rw',
      [db.products, db.customers, db.sales, db.saleItems,
       db.debtTransactions, db.cashDrawers, db.stockMovements, db.expenses, db.heldInvoices, db.syncQueue],
      async () => {
        await Promise.all([
          db.products.clear(),
          db.customers.clear(),
          db.sales.clear(),
          db.saleItems.clear(),
          db.debtTransactions.clear(),
          db.cashDrawers.clear(),
          db.stockMovements.clear(),
          db.expenses.clear(),
          db.heldInvoices.clear(),
          db.syncQueue.clear(),
        ])
      }
    )
  },

  /* ── Read a File → parsed + validated BackupFile ─────────── */
  async readFile(file: File): Promise<BackupFile> {
    const text = await file.text()
    const obj  = JSON.parse(text)
    if (!this.validate(obj)) {
      throw new Error('INVALID_BACKUP')
    }
    return obj
  },
}
