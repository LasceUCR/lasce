import Link from 'next/link'
import type { ReactNode } from 'react'

export interface WorkAreaCardProps {
  title: string
  description: string
  href: string
  icon: ReactNode
}

export function WorkAreaCard({ title, description, href, icon }: WorkAreaCardProps) {
  return (
    <Link className="area-card" href={href}>
      <span className="area-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="area-copy">
        <strong>{title}</strong>
        <small>{description}</small>
        <span className="area-link">
          Ver sección <span aria-hidden="true">→</span>
        </span>
      </span>
    </Link>
  )
}
