import type { Product } from '@/types'
import { cx } from './cx'
import { firstGrapheme, hashIndex } from './text'

/** bg + ink pairs (globals.css --color-tint-*). Static strings so Tailwind generates them. */
const TINTS = [
  'bg-tint-1 text-tint-1-ink', 'bg-tint-2 text-tint-2-ink', 'bg-tint-3 text-tint-3-ink',
  'bg-tint-4 text-tint-4-ink', 'bg-tint-5 text-tint-5-ink', 'bg-tint-6 text-tint-6-ink',
  'bg-tint-7 text-tint-7-ink', 'bg-tint-8 text-tint-8-ink', 'bg-tint-9 text-tint-9-ink',
  'bg-tint-10 text-tint-10-ink',
] as const

export type ProductThumbSize = 48 | 54 | 84

const BOX: Record<ProductThumbSize, string> = {
  48: 'h-12 w-12 rounded-sm',
  54: 'h-[54px] w-[54px] rounded-sm',
  84: 'h-[84px] w-[84px] rounded-md',
}
const LETTER: Record<ProductThumbSize, string> = { 48: 'text-title', 54: 'text-title-lg', 84: 'text-amount-xl' }
const EMOJI: Record<ProductThumbSize, string> = { 48: 'text-amount', 54: 'text-amount', 84: 'text-amount-xl' }

/** The seed / form default — not treated as a "custom" emoji. */
const DEFAULT_EMOJI = '📦'

export interface ProductThumbProps {
  product: Pick<Product, 'id' | 'nameKm' | 'emoji' | 'imageUri'>
  size?: ProductThumbSize | undefined
  /** Full width of the parent at the size's height (product card) */
  fluid?: boolean | undefined
  className?: string | undefined
}

/** Photo → custom emoji on its tint → first character of the Khmer name on its tint. */
export function ProductThumb({ product, size = 48, fluid = false, className }: ProductThumbProps) {
  const tint = TINTS[hashIndex(String(product.id), TINTS.length)]
  const box = fluid
    ? cx(size === 84 ? 'h-[84px] rounded-md' : size === 54 ? 'h-[54px] rounded-sm' : 'h-12 rounded-sm', 'w-full')
    : BOX[size]
  const emoji = product.emoji?.trim()
  const hasCustomEmoji = !!emoji && emoji !== DEFAULT_EMOJI

  if (product.imageUri) {
    return (
      <span aria-hidden="true" className={cx('block shrink-0 overflow-hidden bg-surface-2', box, className)}>
        <img src={product.imageUri} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden select-none leading-none',
        box, tint,
        hasCustomEmoji ? EMOJI[size] : cx(LETTER[size], 'font-bold'),
        className,
      )}
    >
      {hasCustomEmoji ? emoji : firstGrapheme(product.nameKm)}
    </span>
  )
}
