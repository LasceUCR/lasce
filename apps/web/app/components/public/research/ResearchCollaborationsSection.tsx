import { Fragment, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { CollaborationCard } from './CollaborationCard'
import type { ResearchCollaboration } from '@/app/lib/research-collaborations'

export interface ResearchCollaborationsSectionProps {
  id?: string
  collaborations: ResearchCollaboration[]
  renderCard?: (collaboration: ResearchCollaboration) => ReactNode
  addCard?: ReactNode
}

export function ResearchCollaborationsSection({
  id = 'research-collaborations',
  collaborations,
  renderCard,
  addCard,
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
      ) : null}
      {collaborations.length > 0 || addCard ? (
        <div className="collaborations-grid">
          {addCard}
          {collaborations.map((collaboration) => (
            <Fragment key={collaboration.id}>
              {renderCard ? (
                renderCard(collaboration)
              ) : (
                <CollaborationCard
                  acronym={collaboration.acronym}
                  country={collaboration.country}
                  countryLocale={collaboration.countryLocale}
                  websiteUrl={collaboration.websiteUrl}
                  logoPath={collaboration.logoPath}
                  name={collaboration.name}
                  scope={collaboration.scope}
                />
              )}
            </Fragment>
          ))}
        </div>
      ) : null}
    </section>
  )
}
