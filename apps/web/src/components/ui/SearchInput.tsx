import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Tailwind classes for the wrapper (e.g. spacing like "mt-3") */
  className?: string
  autoFocus?: boolean
}

/** Canonical search field — icon prefix, clear button, consistent height/ring.
 *  Use everywhere a "ស្វែងរក" box is needed so search looks identical app-wide. */
export function SearchInput({ value, onChange, placeholder, className = '', autoFocus }: SearchInputProps) {
  return (
    <div className={['relative', className].join(' ')}>
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="សម្អាត"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
