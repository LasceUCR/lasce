import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { ScientificToolsList } from '@/app/components/public/scientific-tools/ScientificToolsList'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { getScientificTools } from '@/app/lib/scientific-tools'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('scientificTools')

  return {
    title: t('meta.title'),
    description: t('hero.intro'),
    alternates: { canonical: '/herramientas-cientificas' },
  }
}

export default async function ScientificToolsRoute() {
  const t = await getTranslations('scientificTools.hero')
  const messages = await getMessages()

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} title={t('title')} lead={t('intro')} />
      <div className="page-width topic-page-footer">
        <ScientificToolsList tools={getScientificTools(messages.scientificTools)} />
      </div>
    </article>
  )
}
