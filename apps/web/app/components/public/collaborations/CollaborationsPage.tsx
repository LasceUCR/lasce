import { useTranslations } from 'next-intl'
import { CollaborationsManager } from './CollaborationsManager'

import { ResearchCollaborationsSection } from '@/app/components/public/research/ResearchCollaborationsSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { CollaborationsContent } from '@/app/lib/collaborations'
import type { ResearchCollaboration } from '@/app/lib/research-collaborations'

import { InitiativeCard } from './InitiativeCard'
import { InitiativesManager } from './InitiativesManager'

export interface CollaborationsPageProps {
  content: CollaborationsContent
  collaborations: ResearchCollaboration[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function CollaborationsPage({
  content,
  collaborations,
  canCreate,
  canEdit,
  canDelete,
}: CollaborationsPageProps) {
  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />

      <CollaborationsContentSection
        collaborations={collaborations}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <TopicSection
        title={content.initiatives.title}
        titleId="collaborations-initiatives-title"
        wide
      >
        {canCreate || canEdit || canDelete ? (
          <InitiativesManager
            initiatives={content.initiatives.items}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ) : content.initiatives.items.length ? (
          content.initiatives.items.map((initiative) => (
            <InitiativeCard key={initiative.id} initiative={initiative} />
          ))
        ) : (
          <InitiativesEmptyState />
        )}
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}

function CollaborationsContentSection({
  collaborations,
  canCreate,
  canEdit,
  canDelete,
}: Omit<CollaborationsPageProps, 'content'>) {
  return canCreate || canEdit || canDelete ? (
    <CollaborationsManager
      collaborations={collaborations}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  ) : (
    <ResearchCollaborationsSection collaborations={collaborations} />
  )
}

function InitiativesEmptyState() {
  const t = useTranslations('initiatives')
  return <p className="content-empty">{t('empty')}</p>
}
