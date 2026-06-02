import type { KHR } from '@/types/branded'

export function toKHR(value: number): KHR {
  return Math.round(value) as KHR
}

/** Format KHR integer for display: 15000 → "15,000 ៛"
 *  Uses Arabic numerals (en-US) — Cambodian shops display prices as 5,000 not ៥.០០០
 */
export function formatKHR(amount: KHR): string {
  return `${amount.toLocaleString('en-US')} ៛`
}

/** Add two KHR amounts safely */
export function addKHR(a: KHR, b: KHR): KHR {
  return (a + b) as KHR
}

/** Subtract two KHR amounts safely */
export function subtractKHR(a: KHR, b: KHR): KHR {
  return (a - b) as KHR
}

/** Multiply KHR by a quantity (qty is a plain integer) */
export function multiplyKHR(price: KHR, qty: number): KHR {
  return Math.round(price * qty) as KHR
}
