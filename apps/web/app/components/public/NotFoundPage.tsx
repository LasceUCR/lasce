
import { useTranslations } from 'next-intl'

import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'

export function NotFoundPage() {
  const t = useTranslations('notFound')
  const common = useTranslations('common')

  return (
    <article className="public-route not-found">
      <div className="page-width">
        <TopicHero kicker={t('kicker')} lead={t('description')} title={t('title')} />
        <div className="topic-page-footer page-width">
          <TopicBackLink href="/" label={common('backToHome')} />
        </div>
      </div>
    </article>
  )
}