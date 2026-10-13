import { useTranslations } from 'next-intl'

import { CollaborationCard } from './CollaborationCard'
import type { ResearchCollaboration } from '@/app/lib/research-collaborations'

export interface ResearchCollaborationsSectionProps {
  id?: string
  collaborations: ResearchCollaboration[]
}

export function ResearchCollaborationsSection({
  id = 'research-collaborations',
  collaborations,
}: ResearchCollaborationsSectionProps) {
  const t = useTranslations('collaborations.section')

  return (
    <section
      aria-labelledby="collaborations-title"
      className="research-collaborations page-width"
      id={id}
    >
      <div className="section-heading">
        <h2 id="collaborations-title">{t('title')}</h2>
        <p className="research-collaborations-description">{t('description')}</p>
      </div>

      {collaborations.length === 0 ? (
        <p className="content-empty" role="status">
          {t('empty')}
        </p>
      ) : (
        <div className="collaborations-grid">
          {collaborations.map((collaboration) => (
            <CollaborationCard
              acronym={collaboration.acronym}
              country={collaboration.country}
              key={collaboration.id}
              name={collaboration.name}
              scope={collaboration.scope}
            />
          ))}
        </div>
      )}
    </section>
  )
}
