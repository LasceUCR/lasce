import { AlbumTile } from '../gallery/AlbumTile'

export interface ResearchArea {
  slug: string
  title: string
  description: string
  src?: string
}

export interface ResearchAreasSectionProps {
  id?: string
  areas: ResearchArea[]
}

export function ResearchAreasSection({ id, areas }: ResearchAreasSectionProps) {
  return (
    <section className="research-areas page-width" id={id}>
      <div className="gallery-grid">
        {areas.map((area) => (
          <AlbumTile
            href={`/investigacion/areas/${area.slug}`}
            key={area.slug}
            meta="Conozca más sobre esta área"
            src={area.src}
            title={area.title}
          />
        ))}
      </div>
    </section>
  )
}
