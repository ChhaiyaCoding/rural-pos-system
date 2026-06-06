/** Return current UTC ISO 8601 string — use for all createdAt/updatedAt writes */
export function nowISO(): string {
  return new Date().toISOString()
}

/** Format a UTC ISO string for display in Khmer locale */
export function formatDateKm(iso: string): string {
  return new Date(iso).toLocaleDateString('km-KH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTimeKm(iso: string): string {
  return new Date(iso).toLocaleString('km-KH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ── Date-only helpers (for due dates: 'YYYY-MM-DD', local) ──────── */

/** Local today as 'YYYY-MM-DD' */
export function todayISODate(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse a 'YYYY-MM-DD' string as a local-midnight Date */
function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Whole days from `fromISO` → `toISO` (positive = to is later) */
export function daysBetweenDates(fromISO: string, toISO: string): number {
  const a = parseDateOnly(fromISO).getTime()
  const b = parseDateOnly(toISO).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** Add n days to a 'YYYY-MM-DD' string → 'YYYY-MM-DD' */
export function addDaysISODate(iso: string, n: number): string {
  const d = parseDateOnly(iso)
  d.setDate(d.getDate() + n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Format a 'YYYY-MM-DD' date-only string in Khmer locale */
export function formatDateOnlyKm(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString('km-KH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
