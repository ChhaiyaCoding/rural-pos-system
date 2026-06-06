import { todayISODate, daysBetweenDates } from '@/lib/date'
import type { Customer } from '@/types'

/** A debt counts as "due soon" when the due date is within this many days */
export const DUE_SOON_DAYS = 3

export type DueStatus = 'none' | 'overdue' | 'due-soon' | 'upcoming'

export interface DueInfo {
  status: DueStatus
  /** Days until the due date: >0 future, 0 today, <0 overdue. null when status='none' */
  daysUntilDue: number | null
  /** How many days the current due date is beyond the first one set */
  daysPostponed: number
}

/** Compute due-date status for a customer (pure — no DB / React). */
export function getDueInfo(c: Customer, today: string = todayISODate()): DueInfo {
  if (!c.dueDate || (c.debtBalance as number) <= 0) {
    return { status: 'none', daysUntilDue: null, daysPostponed: 0 }
  }
  const daysUntilDue = daysBetweenDates(today, c.dueDate)
  const daysPostponed = c.dueDateOriginal
    ? Math.max(0, daysBetweenDates(c.dueDateOriginal, c.dueDate))
    : 0
  const status: DueStatus =
    daysUntilDue < 0 ? 'overdue'
    : daysUntilDue <= DUE_SOON_DAYS ? 'due-soon'
    : 'upcoming'
  return { status, daysUntilDue, daysPostponed }
}
