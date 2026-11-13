import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { ScientificToolsList } from '@/app/components/public/scientific-tools/ScientificToolsList'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
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
  const [t, common, messages] = await Promise.all([
    getTranslations('scientificTools'),
    getTranslations('common'),
    getMessages(),
  ])

  return (
    <article className="topic-page">
      <TopicHero kicker={t('hero.kicker')} title={t('hero.title')} lead={t('hero.intro')} />
      <TopicSection title={t('list.title')}>
        <ScientificToolsList tools={getScientificTools(messages.scientificTools)} />
      </TopicSection>
      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
