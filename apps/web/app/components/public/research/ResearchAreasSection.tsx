import { ResearchAreaCard } from './ResearchAreaCard'

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
      {areas.length > 0 ? (
        <ul className="research-area-list">
          {areas.map((area) => (
            <li key={area.slug}>
              <ResearchAreaCard
                description={area.description}
                href={`/investigacion/areas/${area.slug}`}
                src={area.src}
                title={area.title}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
