import { formatKHR, formatUSD } from '@/lib/money'
import type { KHR } from '@/types'
import { cx } from './cx'

export type MoneySize = 'md' | 'lg' | 'xl' | 'hero'
export type MoneyTone =
  | 'default' | 'muted' | 'success' | 'debt' | 'danger'
  | 'onDark' | 'accent' | 'successOnDark' | 'debtOnDark'

const MAIN_SIZE: Record<MoneySize, string> = {
  md:   'text-title-sm',   // 18
  lg:   'text-amount',     // 28
  xl:   'text-amount-lg',  // 34
  hero: 'text-amount-xl',  // 44
}
const USD_SIZE: Record<MoneySize, string> = {
  md:   'text-meta',
  lg:   'text-body-sm',
  xl:   'text-body',
  hero: 'text-title-sm',
}
const MAIN_TONE: Record<MoneyTone, string> = {
  default:       'text-text',
  muted:         'text-text-muted',
  success:       'text-success',
  debt:          'text-debt',
  danger:        'text-danger',
  onDark:        'text-white',
  accent:        'text-accent',
  successOnDark: 'text-success-on-dark',
  debtOnDark:    'text-debt-on-dark',
}
const ON_DARK: ReadonlySet<MoneyTone> = new Set(['onDark', 'accent', 'successOnDark', 'debtOnDark'])

export interface MoneyTextProps {
  /** Integer KHR — formatted only through formatKHR / formatUSD */
  amount: KHR
  size?: MoneySize | undefined
  /** Show the USD line underneath (default true) */
  usd?: boolean | undefined
  tone?: MoneyTone | undefined
  align?: 'left' | 'right' | 'center' | undefined
  /** Strike through (e.g. a settled amount kept for reference) */
  strike?: boolean | undefined
  className?: string | undefined
}

export function MoneyText({
  amount, size = 'md', usd = true, tone = 'default', align = 'left', strike = false, className,
}: MoneyTextProps) {
  return (
    <span
      className={cx(
        'inline-flex flex-col tabular-nums',
        align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      <span className={cx('font-bold tracking-tight', MAIN_SIZE[size], MAIN_TONE[tone], strike && 'line-through')}>
        {formatKHR(amount)}
      </span>
      {usd && (
        <span
          className={cx(
            'font-semibold',
            USD_SIZE[size],
            ON_DARK.has(tone) ? 'text-ink-300' : 'text-text-muted',
            strike && 'line-through',
          )}
        >
          {formatUSD(amount)}
        </span>
      )}
    </span>
  )
}
