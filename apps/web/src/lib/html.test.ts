import { describe, expect, it } from 'vitest'
import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('neutralises markup typed into names', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">'))
      .toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(escapeHtml("ហាង 'A&B'")).toBe('ហាង &#39;A&amp;B&#39;')
  })

  it('leaves Khmer text alone and handles empty values', () => {
    expect(escapeHtml('អង្ករ ២គីឡូ')).toBe('អង្ករ ២គីឡូ')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})
