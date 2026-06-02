'use client'

interface NumericPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

const KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '000', '0', '⌫',
]

export function NumericPad({ value, onChange, maxLength = 10 }: NumericPadProps) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (value.length >= maxLength) return
    onChange(value + key)
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          className={[
            'h-14 rounded-xl text-xl font-semibold transition-colors select-none',
            key === '⌫'
              ? 'bg-danger-50 text-danger-600 active:bg-danger-100'
              : 'bg-slate-100 text-slate-800 active:bg-slate-200',
          ].join(' ')}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
