import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cx } from './cx'

export interface ListRowProps {
  leading?: ReactNode | undefined
  title: ReactNode
  meta?: ReactNode | undefined
  trailing?: ReactNode | undefined
  chevron?: boolean | undefined
  onClick?: (() => void) | undefined
  href?: string | undefined
  /** card: standalone white row · plain: inside a Card with dividers */
  tone?: 'card' | 'plain' | undefined
  className?: string | undefined
}

export function ListRow({ leading, title, meta, trailing, chevron, onClick, href, tone = 'card', className }: ListRowProps) {
  const interactive = !!onClick || !!href
  const classes = cx(
    'flex w-full min-h-14 items-center gap-3 px-4 py-3 text-left',
    tone === 'card' && 'rounded-lg bg-surface',
    interactive && 'transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink-900',
    className,
  )
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-semibold text-text">{title}</span>
        {meta && <span className="truncate text-meta text-text-muted">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0 text-right">{trailing}</span>}
      {chevron && <ChevronRight size={20} className="shrink-0 text-nav-off" aria-hidden="true" />}
    </>
  )
  if (href) return <Link href={href} className={classes}>{body}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={classes}>{body}</button>
  return <div className={classes}>{body}</div>
}
