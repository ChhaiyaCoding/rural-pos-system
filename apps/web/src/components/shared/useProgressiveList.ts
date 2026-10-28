'use client'

import { useEffect, useState } from 'react'

/** Render a long list a slice at a time: `step` items first, `step` more each
 *  time the sentinel (put it after the list) scrolls near the screen. A shop
 *  with thousands of products then draws ~60 cards instead of all of them.
 *  The slice starts over when `resetKey` changes (a new search or filter). */
export function useProgressiveList<T>(items: readonly T[], resetKey: unknown, step = 60) {
  const [count, setCount] = useState(step)
  const [sentinel, sentinelRef] = useState<HTMLElement | null>(null)

  useEffect(() => { setCount(step) }, [resetKey, step])

  // Re-created after every slice (`count`), so it fires again if the sentinel
  // is still near the screen — e.g. on a tall tablet.
  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setCount((n) => n + step) },
      { rootMargin: '600px 0px' },   // start drawing well before the end is visible
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, count, step])

  return {
    visible: items.length > count ? items.slice(0, count) : items,
    hasMore: items.length > count,
    sentinelRef,
  }
}
