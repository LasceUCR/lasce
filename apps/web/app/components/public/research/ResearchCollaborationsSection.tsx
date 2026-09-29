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
  return (
    <section
      aria-labelledby="collaborations-title"
      className="research-collaborations page-width"
      id={id}
    >
      <div className="section-heading">
        <h2 id="collaborations-title">Colaboraciones de investigación</h2>
        <p className="research-collaborations-description">
          Organizaciones y grupos que colaboran con el LASCE en investigación y desarrollo
          científico a nivel nacional e internacional.
        </p>
      </div>

      {collaborations.length === 0 ? (
        <p className="content-empty" role="status">
          No hay información de colaboraciones disponible actualmente.
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
