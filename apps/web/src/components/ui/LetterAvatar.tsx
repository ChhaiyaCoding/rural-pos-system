import { cx } from './cx'
import { firstGrapheme } from './text'

export type AvatarStatus = 'overdue' | 'dueToday' | 'neutral'

const TONE: Record<AvatarStatus, string> = {
  overdue:  'bg-debt-bg text-debt',
  dueToday: 'bg-warn-bg text-warn',
  neutral:  'bg-surface-2 text-text-subtle',
}
const SIZE = {
  40: 'h-10 w-10 text-body',
  48: 'h-12 w-12 text-title-sm',
  60: 'h-[60px] w-[60px] text-title-lg',
} as const

export interface LetterAvatarProps {
  name: string
  imageUri?: string | null | undefined
  /** Computed by the caller from the customer's debt / due date */
  status?: AvatarStatus | undefined
  size?: keyof typeof SIZE | undefined
  className?: string | undefined
}

/** Customer photo, or the first letter of the name tinted by debt status. */
export function LetterAvatar({ name, imageUri, status = 'neutral', size = 48, className }: LetterAvatarProps) {
  if (imageUri) {
    return (
      <span aria-hidden="true" className={cx('block shrink-0 overflow-hidden rounded-full bg-surface-2', SIZE[size], className)}>
        <img src={imageUri} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cx('flex shrink-0 items-center justify-center rounded-full font-bold leading-none', SIZE[size], TONE[status], className)}
    >
      {firstGrapheme(name)}
    </span>
  )
}
