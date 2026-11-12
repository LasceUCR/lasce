import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'

export interface ScientificToolItem {
  title: string
  description: string
  href: string
  imageSrc: string
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
      {tools.map(({ title, description, href, imageSrc }) => (
        <InfoCard
          key={title}
          title={title}
          description={description}
          icon={<Image src={imageSrc} alt="" fill sizes="(max-width: 760px) 100vw, 280px" />}
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
