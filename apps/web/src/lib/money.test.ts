import { afterEach, describe, expect, it } from 'vitest'
import {
  addKHR, formatDual, formatKHR, formatUSD, getExchangeRate, multiplyKHR,
  setExchangeRate, subtractKHR, toKHR,
} from './money'
import type { KHR } from '@/types/branded'

const k = (n: number) => n as KHR

afterEach(() => setExchangeRate(4000))

describe('KHR integer math', () => {
  it('toKHR rounds to whole riel', () => {
    expect(toKHR(1000.4)).toBe(1000)
    expect(toKHR(1000.5)).toBe(1001)
  })

  it('adds and subtracts', () => {
    expect(addKHR(k(1500), k(2500))).toBe(4000)
    expect(subtractKHR(k(5000), k(7500))).toBe(-2500)
  })

  it('multiplyKHR stays an integer for fractional quantities', () => {
    expect(multiplyKHR(k(2500), 3)).toBe(7500)
    expect(multiplyKHR(k(3333), 1.5)).toBe(5000) // 4999.5 → 5000
    expect(Number.isInteger(multiplyKHR(k(1234), 0.37))).toBe(true)
  })
})

describe('display formatting', () => {
  it('formatKHR uses thousands separators and ៛', () => {
    expect(formatKHR(k(0))).toBe('0 ៛')
    expect(formatKHR(k(1250000))).toBe('1,250,000 ៛')
    expect(formatKHR(k(-5000))).toBe('-5,000 ៛')
  })

  it('formatUSD converts at the configured rate', () => {
    expect(formatUSD(k(5000))).toBe('$1.25')
    expect(formatUSD(k(8000))).toBe('$2')          // whole dollars drop cents
    expect(formatUSD(k(350000))).toBe('$87.50')
    expect(formatUSD(k(-350000))).toBe('-$87.50')  // minus before the $
    expect(formatUSD(k(4100), 4100)).toBe('$1')
  })

  it('setExchangeRate changes the default rate and ignores invalid values', () => {
    setExchangeRate(4100)
    expect(getExchangeRate()).toBe(4100)
    expect(formatUSD(k(8200))).toBe('$2')
    setExchangeRate(0)
    setExchangeRate(-1)
    expect(getExchangeRate()).toBe(4100)
  })

  it('formatDual shows both currencies', () => {
    expect(formatDual(k(5000))).toBe('5,000 ៛ · $1.25')
  })
})
