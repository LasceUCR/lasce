import type { ReactNode } from 'react'

export interface InfoCardProps {
  title: string
  description: string
  icon: ReactNode
  more?: string
  moreLabel?: string
}

export function InfoCard({ title, description, icon, more, moreLabel = 'Más información' }: InfoCardProps) {
  return (
    <article className="surface-card info-card">
      <span className="info-card-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {more ? (
        <details className="info-card-more">
          <summary>{moreLabel}</summary>
          <p>{more}</p>
        </details>
      ) : null}
    </article>
  )
}
