'use client'

import { useEffect, useRef, useState } from 'react'

export interface FlyItem {
  id:       string
  emoji:    string
  imageUri: string | null
  startX:   number   // center X of tapped card (viewport coords)
  startY:   number   // center Y of tapped card
  endX:     number   // cart icon center X
  endY:     number   // cart icon center Y
}

interface Props {
  items:    FlyItem[]
  onDone:   (id: string) => void
}

/** Single flying bubble */
function FlyBubble({ item, onDone }: { item: FlyItem; onDone: () => void }) {
  const [phase, setPhase] = useState<'start' | 'fly'>('start')
  const ref = useRef<HTMLDivElement>(null)

  // One rAF delay so the browser paints the start position before we transition
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('fly'))
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const SIZE_START = 52
  const SIZE_END   = 14

  const style: React.CSSProperties = {
    position:    'fixed',
    zIndex:      9999,
    pointerEvents: 'none',
    borderRadius: '50%',
    overflow:    'hidden',
    display:     'flex',
    alignItems:  'center',
    justifyContent: 'center',
    boxShadow:   '0 4px 16px rgba(37,99,235,0.35)',
    background:  item.imageUri ? '#fff' : '#2563eb',
    fontSize:    '22px',
    lineHeight:  '1',

    // Start state
    width:    phase === 'start' ? SIZE_START : SIZE_END,
    height:   phase === 'start' ? SIZE_START : SIZE_END,
    left:     phase === 'start'
      ? item.startX - SIZE_START / 2
      : item.endX   - SIZE_END   / 2,
    top:      phase === 'start'
      ? item.startY - SIZE_START / 2
      : item.endY   - SIZE_END   / 2,
    opacity:  phase === 'start' ? 1 : 0,

    transition: phase === 'fly'
      ? 'left 0.52s cubic-bezier(0.25,0.46,0.45,0.94), top 0.52s cubic-bezier(0.25,0.46,0.45,0.94), width 0.52s ease, height 0.52s ease, opacity 0.38s ease 0.14s'
      : 'none',
  }

  return (
    <div
      ref={ref}
      style={style}
      onTransitionEnd={() => {
        if (phase === 'fly') onDone()
      }}
    >
      {item.imageUri ? (
        <img src={item.imageUri} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ filter: 'brightness(10)', fontSize: 22 }}>{item.emoji}</span>
      )}
    </div>
  )
}

export function FlyToCartOverlay({ items, onDone }: Props) {
  if (items.length === 0) return null
  return (
    <>
      {items.map((item) => (
        <FlyBubble key={item.id} item={item} onDone={() => onDone(item.id)} />
      ))}
    </>
  )
}
