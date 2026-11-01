import { Skeleton, SkeletonText } from '@/app/components/public/skeleton/Skeleton'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { PAGE_SIZE } from '@/app/lib/pagination'

import paginationStyles from '../Pagination.module.css'

/** One full page of the listing. The real count is not known until the database answers. */
const CARD_PLACEHOLDERS = PAGE_SIZE

export interface PublicationsPageSkeletonProps {
  kicker: string
  title: string
  lead: string
  /** The listing heading, "Publicaciones recientes". Catalogue copy, not a record. */
  listTitle: string
  /** Announced while the listing is still loading. Already translated. */
  label: string
  backLabel: string
}

/**
 * `/publicaciones`'s `loading.tsx`. The hero, the listing heading and the back link are catalogue
 * copy, so they render for real. The toolbar count, the result line, the cards and the page
 * controls come from the database and are still pending, so each is a placeholder the size of
 * the finished listing. Same split as `/galeria`: fixed copy stays, the records do not.
 */
export function PublicationsPageSkeleton({
  kicker,
  title,
  lead,
  listTitle,
  label,
  backLabel,
}: PublicationsPageSkeletonProps) {
  return (
    <article className="topic-page">
      <TopicHero kicker={kicker} lead={lead} title={title} />

      <p className="sr-only" role="status">
        {label}
      </p>

      <section aria-labelledby="publications-title" className="publications page-width">
        <div aria-hidden="true" className="publications-toolbar" inert>
          <div className="publications-search">
            <Skeleton height={44} />
          </div>
          <div className="publications-group-filter">
            <Skeleton height={44} />
          </div>
          <div className="publications-kpi">
            <Skeleton shape="text" width="70%" />
          </div>
        </div>

        <h2 id="publications-title">{listTitle}</h2>

        <div aria-hidden="true" inert>
          <p className="publications-summary">
            <Skeleton shape="text" width="14rem" />
          </p>
          <div className="publication-list">
            {Array.from({ length: CARD_PLACEHOLDERS }, (_, index) => (
              <PublicationCardSkeleton key={index} />
            ))}
          </div>
          <div className={paginationStyles.pagination}>
            <Skeleton height={40} width={120} />
            <Skeleton height={40} width={40} />
            <Skeleton height={40} width={40} />
            <Skeleton height={40} width={40} />
            <Skeleton height={40} width={120} />
          </div>
        </div>
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={backLabel} />
      </div>
    </article>
  )
}

/** One publication card: title, the author line and a two-line abstract. */
function PublicationCardSkeleton() {
  return (
    <div className="surface-card publication-card">
      <Skeleton height="1.1rem" shape="text" width="62%" />
      <Skeleton shape="text" width="40%" />
      <div className="publication-abstract">
        <SkeletonText lastLineWidth="75%" lines={2} />
      </div>
    </div>
  )
}
