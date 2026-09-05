import { ArrowLeft } from 'lucide-react'

import { Button } from '@/app/components/public/Button'

export interface TopicBackLinkProps {
  href: string
  label: string
}

export function TopicBackLink({ href, label }: TopicBackLinkProps) {
  return (
    <Button
      href={href}
      icon={<ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />}
      variant="secondary"
    >
      {label}
    </Button>
  )
}
