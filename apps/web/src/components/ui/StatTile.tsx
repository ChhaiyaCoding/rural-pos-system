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
      <span className={cx('text-title-sm font-bold tabular-nums truncate max-w-full', dark ? 'text-white' : 'text-text')}>
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
