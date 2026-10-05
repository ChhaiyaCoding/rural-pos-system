'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cx } from './cx'
import { IconButton, iconButtonClass } from './IconButton'

export interface PageHeaderProps {
  /** light: on the app background · hero: ink-900 block with a 32px rounded bottom */
  variant?: 'light' | 'hero' | undefined
  title: ReactNode
  subtitle?: ReactNode | undefined
  /** Back as a link (preferred) … */
  backHref?: string | undefined
  /** … or as a callback */
  onBack?: (() => void) | undefined
  backLabel?: string | undefined
  /** Shown before the title when there is no back button (e.g. a store tile) */
  leading?: ReactNode | undefined
  /** Right-side buttons */
  actions?: ReactNode | undefined
  /** Hero content under the title row */
  children?: ReactNode
  /** Hero only: tighter top padding for task screens (e.g. the POS) */
  compact?: boolean | undefined
  className?: string | undefined
}

export function PageHeader({
  variant = 'light', title, subtitle, backHref, onBack, backLabel = 'ត្រឡប់ក្រោយ',
  leading, actions, children, compact = false, className,
}: PageHeaderProps) {
  const hero = variant === 'hero'
  const btnVariant = hero ? 'onDark' : 'light'
  const back = backHref
    ? <Link href={backHref} aria-label={backLabel} className={iconButtonClass(btnVariant)}><ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" /></Link>
    : onBack
      ? <IconButton aria-label={backLabel} variant={btnVariant} onClick={onBack}><ChevronLeft size={22} strokeWidth={2.25} /></IconButton>
      : null

  /* Top padding = status-bar inset (min 12px) + 12px, so the first row sits
     right below the status bar in Safari, standalone PWA and notched phones. */
  return (
    <header
      className={cx(
        'shrink-0 px-4 md:px-7',
        hero
          ? cx(
              'rounded-b-2xl bg-ink-900 text-white md:pt-6',
              'pt-[calc(max(env(safe-area-inset-top),12px)+12px)]',
              compact ? 'pb-3' : 'pb-5',
            )
          : 'pb-3 pt-[calc(max(env(safe-area-inset-top),12px)+12px)]',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {back ?? leading}
        <div className="min-w-0 flex-1">
          <h1 className={cx('truncate font-bold', compact ? 'text-title-sm' : 'text-title', hero ? 'text-white' : 'text-text')}>{title}</h1>
          {subtitle != null && (
            <p className={cx('truncate text-meta', hero ? 'text-ink-300' : 'text-text-muted')}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children != null && <div className={compact ? 'mt-3' : 'mt-4'}>{children}</div>}
    </header>
  )
}
