import type { Product } from '@/types'

/* Khmer numeral → Arabic numeral, so "៥០០០" matches price 5000 */
const KH_DIGITS = '០១២៣៤៥៦៧៨៩'
export function normalizeDigits(s: string): string {
  return s.replace(/[០-៩]/g, (d) => String(KH_DIGITS.indexOf(d)))
}

/**
 * Smart product match — a single query box that searches across:
 *  • nameKm   (Khmer name)
 *  • nameEn   (English / Latin name)
 *  • barcode  (numbers)
 *  • unit     (e.g. "ដប", "kg")
 *  • sellPrice (type a number → finds items at that price)
 *
 * Case-insensitive; Khmer numerals are normalized to Arabic.
 */
export function productMatchesQuery(p: Product, rawQuery: string): boolean {
  const q = normalizeDigits(rawQuery.trim().toLowerCase())
  if (!q) return true

  const nameKm  = p.nameKm.toLowerCase()
  const nameEn  = (p.nameEn ?? '').toLowerCase()
  const barcode = (p.barcode ?? '').toLowerCase()
  const unit    = p.unit.toLowerCase()

  // Text fields
  if (nameKm.includes(q))            return true
  if (nameEn && nameEn.includes(q))  return true
  if (barcode && barcode.includes(q)) return true
  if (unit.includes(q))              return true

  // Numeric query → price match (digits only, ignores commas/spaces)
  const digits = q.replace(/[^\d]/g, '')
  if (digits && String(p.sellPrice).includes(digits)) return true

  return false
}
