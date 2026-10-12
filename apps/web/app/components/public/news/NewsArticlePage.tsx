import { Calendar, ExternalLink, Newspaper, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { NewsArticle } from '@/app/lib/news'

export interface NewsArticlePageProps {
  article: NewsArticle
  backHref?: string
  /** Defaults to "Volver a noticias" in the visitor's language. */
  backLabel?: string
}

/**
 * Dedicated detail page for a single news article, following the same pattern
 * and structure as `AcademicActivityPage`.
 */
export function NewsArticlePage({
  article,
  backHref = '/noticias',
  backLabel,
}: NewsArticlePageProps) {
  const t = useTranslations('news.page')
  const hasMetadata = Boolean(article.authors || article.source || article.date)

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} title={article.title} />

      {hasMetadata ? (
        <TopicSection title={t('infoTitle')} titleId="news-info-title">
          <CardGrid columns={3} equalHeight>
            {article.authors ? (
              <InfoCard
                description={article.authors}
                icon={<User size={22} strokeWidth={1.8} />}
                title={t('authors')}
              />
            ) : null}
            {article.source ? (
              <InfoCard
                description={article.source}
                icon={<Newspaper size={22} strokeWidth={1.8} />}
                title={t('source')}
              />
            ) : null}
            {article.date ? (
              <InfoCard
                description={article.date}
                icon={<Calendar size={22} strokeWidth={1.8} />}
                title={t('date')}
              />
            ) : null}
          </CardGrid>
        </TopicSection>
      ) : null}

      <TopicSection title={t('descriptionTitle')} titleId="news-description-title" wide>
        {article.abstract.split('\n\n').map((paragraph, index) => (
          <p className="topic-intro" key={index}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      {article.href ? (
        <TopicSection title={t('resourcesTitle')} titleId="news-source-title" wide>
          <div className="activity-resources-action">
            <Button
              href={article.href}
              icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
              rel="noopener noreferrer"
              target="_blank"
              variant="primary"
            >
              {t('openSource')}
            </Button>
          </div>
        </TopicSection>
      ) : null}

      <div className="topic-page-footer topic-detail-footer page-width">
        <TopicBackLink href={backHref} label={backLabel ?? t('backToNews')} />
      </div>
    </article>
  )
}
