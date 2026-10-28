/** First user-perceived character (grapheme) of a string — keeps a Khmer
 *  consonant together with its vowel/subscript marks. */
export function firstGrapheme(s: string): string {
  const t = s.trim()
  if (!t) return '?'
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const first = new Intl.Segmenter('km', { granularity: 'grapheme' }).segment(t)[Symbol.iterator]().next()
    if (!first.done) return first.value.segment
  }
  return Array.from(t)[0] ?? '?'
}

/** Stable small integer in [0, n) from a string id (djb2). */
export function hashIndex(id: string, n: number): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0
  return Math.abs(h) % n
}
