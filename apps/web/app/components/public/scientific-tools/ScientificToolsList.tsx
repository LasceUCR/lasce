import { ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'

export interface ScientificToolItem {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

export interface ScientificToolsListProps {
  tools: readonly ScientificToolItem[]
}

export function ScientificToolsList({ tools }: ScientificToolsListProps) {
  const t = useTranslations('scientificTools.list')

  if (tools.length === 0) {
    return (
      <p className="content-empty" role="status">
        {t('empty')}
      </p>
    )
  }

  return (
    <CardGrid columns={1}>
      {tools.map(({ title, description, href, icon: Icon }) => (
        <InfoCard
          key={title}
          title={title}
          description={description}
          icon={<Icon aria-hidden="true" size={48} strokeWidth={1.6} />}
          layout="horizontal"
          action={
            <Button
              href={href}
              icon={<ExternalLink aria-hidden="true" size={18} strokeWidth={1.8} />}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t('access', { title })}
            </Button>
          }
        />
      ))}
    </CardGrid>
  )
}
