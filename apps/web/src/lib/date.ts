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
