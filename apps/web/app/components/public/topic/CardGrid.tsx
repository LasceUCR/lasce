'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export type CardGridTone = 'default' | 'teal'

export interface CardGridProps {
  columns?: 2 | 3 | 4
  equalHeight?: boolean
  expandable?: boolean
  tone?: CardGridTone
  children: ReactNode
}

export function CardGrid({
  columns = 4,
  equalHeight = false,
  expandable = false,
  tone = 'default',
  children,
}: CardGridProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState<number>()

  useLayoutEffect(() => {
    if (!expandable) {
      return
    }

    const root = rootRef.current
    if (!root) {
      return
    }

    function measure() {
      if (!root) {
        return
      }

      root.classList.add('card-grid-measuring')
      let maxHeight = 0

      root.querySelectorAll<HTMLElement>('.info-card').forEach((card) => {
        const details = card.querySelector('details')
        if (details?.open) {
          return
        }

        maxHeight = Math.max(maxHeight, card.offsetHeight)
      })

      root.classList.remove('card-grid-measuring')

      if (maxHeight > 0) {
        setMinHeight((current) => (current === maxHeight ? current : maxHeight))
      }
    }

    measure()
    root.addEventListener('toggle', measure, true)
    window.addEventListener('resize', measure)

    return () => {
      root.removeEventListener('toggle', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [children, expandable])

  const classes = [
    'card-grid',
    `card-grid-${columns}`,
    equalHeight ? 'card-grid-equal' : '',
    expandable ? 'card-grid-expandable' : '',
    tone !== 'default' ? `card-grid-tone-${tone}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style =
    expandable && minHeight
      ? ({ '--card-min-height': `${minHeight}px` } as CSSProperties)
      : undefined

  return (
    <div className={classes} ref={rootRef} style={style}>
      {children}
    </div>
  )
}
