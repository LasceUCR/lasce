import { LocationMapSkeleton } from '@/app/components/public/rosac/LocationMapSkeleton'
import { Skeleton, SkeletonText } from '@/app/components/public/skeleton/Skeleton'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { ContactContent } from '@/app/lib/contact'

import styles from './ContactPage.module.css'

/**
 * Phone and Instagram, the two channels the migration seeds. The real count is not known until
 * the database answers, so the grid reserves the size visitors usually see.
 */
export const CONTACT_CHANNEL_PLACEHOLDERS = 2

export interface ContactPageSkeletonProps {
  content: ContactContent
  /** Announced while the channel cards are still loading. Already translated. */
  label: string
}

/**
 * `/contacto`'s `loading.tsx`. The hero, the location heading and address, the channels heading
 * and the back link are catalogue copy, so they render for real. The map script and the channel
 * cards are not ready yet: each gets a placeholder the size of the finished content, the same
 * way `/datos` keeps its headings and only placeholders the strip or the query result.
 */
export function ContactPageSkeleton({ content, label }: ContactPageSkeletonProps) {
  return (
    <article className={`topic-page ${styles.page}`}>
      <TopicHero {...content.hero} />

      <p className="sr-only" role="status">
        {label}
      </p>

      <TopicSection
        className={styles.location}
        id="ubicacion"
        intro={content.location.intro}
        title={content.location.title}
        titleId="ubicacion-titulo"
      >
        <div aria-hidden="true" inert>
          <LocationMapSkeleton />
        </div>
      </TopicSection>

      <TopicSection
        id="informacion-de-contacto"
        title={content.channelsTitle}
        titleId="informacion-de-contacto-titulo"
      >
        <div aria-hidden="true" className="card-grid card-grid-3 card-grid-equal" inert>
          {Array.from({ length: CONTACT_CHANNEL_PLACEHOLDERS }, (_, index) => (
            <ContactChannelCardSkeleton key={index} />
          ))}
        </div>
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}

/** One channel card: icon tile, title and a short description. */
function ContactChannelCardSkeleton() {
  return (
    <div className="surface-card info-card">
      <span className={styles.channelIcon}>
        <Skeleton className={styles.channelIconFill} />
      </span>
      <div className="info-card-content">
        <Skeleton shape="text" width="55%" />
        <SkeletonText lastLineWidth="65%" lines={2} />
      </div>
    </div>
  )
}
