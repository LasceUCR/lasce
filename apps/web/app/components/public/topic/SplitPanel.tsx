import type { ReactNode } from 'react'

export interface SplitPanelProps {
  children: ReactNode
}

export function SplitPanel({ children }: SplitPanelProps) {
  return <div className="topic-split">{children}</div>
}
