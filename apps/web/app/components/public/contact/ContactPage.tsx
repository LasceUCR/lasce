import { RosacLocationMapLoader } from '@/app/components/public/rosac/RosacLocationMapLoader'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { ContactCard } from '@/app/lib/contact-channel-schema'
import type { ContactContent } from '@/app/lib/contact'

import { ContactChannelSection } from './ContactChannelSection'
import styles from './ContactPage.module.css'

export interface ContactPageProps {
  content: ContactContent
  cards: readonly ContactCard[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function ContactPage({
  content,
  cards,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: ContactPageProps) {
  return (
    <article className={`topic-page ${styles.page}`}>
      <TopicHero {...content.hero} />
      <TopicSection
        className={styles.location}
        id="ubicacion"
        intro={content.location.intro}
        title={content.location.title}
        titleId="ubicacion-titulo"
      >
        <RosacLocationMapLoader labels={content.location.labels} location={content.location} />
      </TopicSection>
      <ContactChannelSection
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        cards={cards}
        title={content.channelsTitle}
      />
      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
