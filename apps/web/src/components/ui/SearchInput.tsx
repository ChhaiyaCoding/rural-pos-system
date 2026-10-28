import { ScanLine, Search, X } from 'lucide-react'
import { cx } from './cx'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string | undefined
  /** Tailwind classes for the wrapper (e.g. spacing like "mt-3") */
  className?: string | undefined
  autoFocus?: boolean | undefined
  /** When set, shows an accent scan button after the field */
  onScan?: (() => void) | undefined
  scanLabel?: string | undefined
}

/** Canonical search field — icon prefix, clear button, optional scan button.
 *  Use everywhere a "ស្វែងរក" box is needed so search looks identical app-wide. */
export function SearchInput({
  value, onChange, placeholder, className, autoFocus, onScan, scanLabel = 'ស្កែនបាកូដ',
}: SearchInputProps) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div className="relative min-w-0 flex-1">
        <Search
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder ?? 'ស្វែងរក'}
          autoFocus={autoFocus}
          className={cx(
            'h-[52px] w-full rounded-md border border-line bg-surface pl-12 pr-12',
            'text-body text-text placeholder:text-text-muted',
            'focus:border-ink-700 focus:outline-none focus:ring-2 focus:ring-ink-900/10',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="សម្អាត"
            className="absolute right-0.5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ink-900"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-text-subtle" aria-hidden="true">
              <X size={15} strokeWidth={2.5} />
            </span>
          </button>
        )}
      </div>
      {onScan && (
        <button
          type="button"
          onClick={onScan}
          aria-label={scanLabel}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md bg-accent text-ink-900 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          <ScanLine size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
