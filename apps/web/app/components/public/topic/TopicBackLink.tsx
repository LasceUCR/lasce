import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export interface TopicBackLinkProps {
  href: string
  label: string
}

export function TopicBackLink({ href, label }: TopicBackLinkProps) {
  return (
    <Link className="topic-back" href={href}>
      <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
      {label}
    </Link>
  )
}
