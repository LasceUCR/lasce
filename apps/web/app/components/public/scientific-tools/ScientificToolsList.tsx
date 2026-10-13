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
    <>
      <CardGrid columns={1}>
        {tools.map(({ title, description, href }) => (
          <InfoCard
            key={title}
            title={title}
            description={description}
            icon={
              <Image src="/images/tools/scientific-pattern.webp" alt="" width={160} height={96} />
            }
            headingLevel={2}
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
      <p className="topic-intro">{t('externalNotice')}</p>
    </>
  )
}
