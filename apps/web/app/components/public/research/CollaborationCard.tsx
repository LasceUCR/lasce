import { Globe, MapPin } from 'lucide-react'

import type { CollaborationScope } from '@/app/lib/research-collaborations'

export interface CollaborationCardProps {
  name: string
  acronym?: string
  country: string
  scope: CollaborationScope
}

export function CollaborationCard({ name, acronym, country, scope }: CollaborationCardProps) {
  const isNational = scope === 'national'

  return (
    <article className="surface-card collaboration-card">
      <div className="collaboration-card-header">
        <span className={`collaboration-badge collaboration-badge-${scope}`} data-scope={scope}>
          {isNational ? 'Nacional' : 'Internacional'}
        </span>
        <span className="collaboration-country">
          {isNational ? (
            <MapPin aria-hidden="true" size={14} />
          ) : (
            <Globe aria-hidden="true" size={14} />
          )}
          <span>{country}</span>
        </span>
      </div>

      <h3 className="collaboration-name">{name}</h3>

      {acronym ? (
        <p className="collaboration-acronym">
          <strong>Siglas:</strong> {acronym}
        </p>
      ) : null}
    </article>
  )
}
