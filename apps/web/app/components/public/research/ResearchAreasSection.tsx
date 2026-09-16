import { useId } from 'react'

import { AlbumTile } from '../gallery/AlbumTile'

export interface ResearchArea {
  slug: string
  title: string
  description: string
  src?: string
  lead?: string
  objectives?: string[]
  scope?: string
  topics?: string[]
}

export interface ResearchAreasSectionProps {
  id?: string
  title: string
  subtitle: string
  areas: ResearchArea[]
}

export function ResearchAreasSection({ id, title, subtitle, areas }: ResearchAreasSectionProps) {
  const fallbackTitleId = useId()
  const titleId = id ? `${id}-title` : fallbackTitleId

  return (
    <section className="research-areas page-width" id={id} aria-labelledby={titleId}>
      <div className="section-heading">
        <h2 id={titleId}>{title}</h2>
        <p className="research-areas-description">{subtitle}</p>
      </div>

      <div className="gallery-grid">
        {areas.map((area) => (
          <AlbumTile
            href={`/investigacion/areas/${area.slug}`}
            key={area.slug}
            meta={area.description}
            src={area.src}
            title={area.title}
          />
        ))}
      </div>
    </section>
  )
}
