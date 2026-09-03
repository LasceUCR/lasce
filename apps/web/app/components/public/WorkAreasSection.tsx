import { useId, type ReactNode } from 'react'

import { WorkAreaCard } from './WorkAreaCard'

export interface WorkAreaItem {
  title: string
  description: string
  href: string
  icon: ReactNode
}

export interface WorkAreasSectionProps {
  id?: string
  title: string
  subtitle: string
  areas: WorkAreaItem[]
}

export function WorkAreasSection({ id, title, subtitle, areas }: WorkAreasSectionProps) {
  const fallbackTitleId = useId()
  const titleId = id ? `${id}-title` : fallbackTitleId

  return (
    <section className="areas page-width" id={id} aria-labelledby={titleId}>
      <div className="section-heading">
        <h2 id={titleId}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="area-grid">
        {areas.map((area) => (
          <WorkAreaCard
            description={area.description}
            href={area.href}
            icon={area.icon}
            key={area.href}
            title={area.title}
          />
        ))}
      </div>
    </section>
  )
}
