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

/* ── Cambodia time (fixed UTC+7, no DST) ─────────────────────────
   All "today"/day-bucketing anchors to the Cambodian calendar day so totals
   agree across modules regardless of the device timezone. */
export const CAMBODIA_UTC_OFFSET_MIN = 7 * 60

/** An instant shifted into Cambodia wall-clock time — read it with UTC getters. */
function khShift(ms: number): Date {
  return new Date(ms + CAMBODIA_UTC_OFFSET_MIN * 60_000)
}

/** Cambodia calendar date ('YYYY-MM-DD') for a given instant (ms since epoch). */
function khDateString(ms: number): string {
  const s = khShift(ms)
  const m = String(s.getUTCMonth() + 1).padStart(2, '0')
  const d = String(s.getUTCDate()).padStart(2, '0')
  return `${s.getUTCFullYear()}-${m}-${d}`
}

/** Start of the Cambodia day `n` days ago, returned as a UTC ISO string.
 *  Use to bucket same-day/period activity by the Cambodian calendar day. */
export function startOfDaysAgoISO(n: number): string {
  const s = khShift(Date.now())
  // Cambodia midnight = that date 00:00 (+7) = UTC midnight − 7h
  return new Date(
    Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() - n) - CAMBODIA_UTC_OFFSET_MIN * 60_000,
  ).toISOString()
}

/** Start of "today" in Cambodia time, as a UTC ISO string. */
export function startOfTodayISO(): string {
  return startOfDaysAgoISO(0)
}

/** Cambodia calendar date ('YYYY-MM-DD') for a UTC ISO timestamp. */
export function dateKHFromISO(iso: string): string {
  return khDateString(new Date(iso).getTime())
}

/* ── Date-only helpers ('YYYY-MM-DD') ────────────────────────────── */

/** Cambodia today as 'YYYY-MM-DD'. */
export function todayISODate(): string {
  return khDateString(Date.now())
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
