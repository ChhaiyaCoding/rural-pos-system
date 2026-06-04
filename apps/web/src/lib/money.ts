import type { KHR } from '@/types/branded'

export function toKHR(value: number): KHR {
  return Math.round(value) as KHR
}

/* ── Exchange rate (KHR per 1 USD) ──────────────────────────────────
   DB always stores integer Riel. USD is a DISPLAY conversion only.
   Module-level so the pure money lib stays free of React/Zustand —
   the app calls setExchangeRate() once from the store on load.        */
let exchangeRate = 4000 // default: 1 USD = 4,000 ៛ (configurable in Settings)

export function setExchangeRate(rate: number): void {
  if (rate > 0) exchangeRate = rate
}

export function getExchangeRate(): number {
  return exchangeRate
}

/** Format KHR integer for display: 15000 → "15,000 ៛"
 *  Uses Arabic numerals (en-US) — Cambodian shops display prices as 5,000 not ៥.០០០
 */
export function formatKHR(amount: KHR): string {
  return `${amount.toLocaleString('en-US')} ៛`
}

/** Convert KHR → USD display string: 5000 → "$1.25" (rounds to 2 decimals).
 *  Whole-dollar amounts drop the cents: 8000 → "$2".                       */
export function formatUSD(amount: KHR, rate = exchangeRate): string {
  const usd = amount / rate
  const rounded = Math.round(usd * 100) / 100
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `$${text}`
}

/** Dual currency on one line: 5000 → "5,000 ៛ · $1.25" */
export function formatDual(amount: KHR, rate = exchangeRate): string {
  return `${formatKHR(amount)} · ${formatUSD(amount, rate)}`
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
