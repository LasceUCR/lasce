import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
      </span>
      <span className="area-arrow" aria-hidden="true">
        <ArrowRight size={20} strokeWidth={2} />
      </span>
    </Link>
  )
}
