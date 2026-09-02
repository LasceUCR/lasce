import type { ReactNode } from 'react'

export interface CardGridProps {
  columns?: 2 | 3 | 4
  children: ReactNode
}

export function CardGrid({ columns = 4, children }: CardGridProps) {
  return <div className={`card-grid card-grid-${columns}`}>{children}</div>
}
