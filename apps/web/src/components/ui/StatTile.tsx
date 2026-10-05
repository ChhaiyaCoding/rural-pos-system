import type { ReactNode } from 'react'
import { cx } from './cx'

export interface StatTileProps {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode | undefined
  /** light = white tile · onDark = ink-800 tile inside a dark hero */
  tone?: 'light' | 'onDark' | undefined
  /** Background class for a small colored status dot before the label, e.g. "bg-debt" */
  dot?: string | undefined
  /** When set, the tile is a toggle button (e.g. a filter) */
  onClick?: (() => void) | undefined
  pressed?: boolean | undefined
  className?: string | undefined
}

/* A 3-up phone tile has ~81px for the value. Long money strings
   ("13,125,000 ៛") are stepped down in size instead of being cut off with "…";
   only extreme lengths may wrap. */
function valueSize(value: ReactNode): string {
  if (typeof value !== 'string') return 'text-title-sm truncate'
  if (value.length <= 7) return 'text-title-sm whitespace-nowrap'
  if (value.length <= 9) return 'text-body whitespace-nowrap'
  if (value.length <= 11) return 'text-body-sm whitespace-nowrap'
  if (value.length <= 13) return 'text-meta whitespace-nowrap'
  return 'text-meta'
}

export function StatTile({ label, value, sub, tone = 'light', dot, onClick, pressed, className }: StatTileProps) {
  const dark = tone === 'onDark'
  const classes = cx(
    'flex flex-col items-start gap-0.5 rounded-lg p-3.5 text-left min-w-0',
    dark ? 'bg-ink-800' : 'bg-surface',
    onClick && 'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
    onClick && (dark ? 'active:bg-ink-700 focus-visible:outline-accent' : 'active:bg-surface-2 focus-visible:outline-ink-900'),
    pressed && 'ring-2 ring-accent',
    className,
  )
  const body = (
    <>
      <span className={cx('flex items-center gap-1.5 text-meta', dark ? 'text-ink-300' : 'text-text-muted')}>
        {dot && <span className={cx('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden="true" />}
        {label}
      </span>
      <span className={cx('max-w-full font-bold tabular-nums', valueSize(value), dark ? 'text-white' : 'text-text')}>
        {value}
      </span>
      {sub && <span className={cx('text-caption', dark ? 'text-ink-300' : 'text-text-muted')}>{sub}</span>}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={pressed ?? false} className={cx(classes, 'w-full')}>
        {body}
      </button>
    )
  }
  return <div className={classes}>{body}</div>
}
