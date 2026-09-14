import { useId, type ReactNode } from 'react'

export interface InfoCardProps {
  title: string
  description: string
  icon: ReactNode
  more?: string
  moreLabel?: string
  layout?: 'vertical' | 'horizontal'
  headingLevel?: 2 | 3
  action?: ReactNode
}

export function InfoCard({
  title,
  description,
  icon,
  more,
  moreLabel = 'Más información',
  layout = 'vertical',
  headingLevel = 3,
  action,
}: InfoCardProps) {
  const titleId = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <article aria-labelledby={titleId} className={`surface-card info-card info-card-${layout}`}>
      <span className="info-card-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="info-card-content">
        <Heading id={titleId}>{title}</Heading>
        <p>{description}</p>
        {more ? (
          <details className="info-card-more">
            <summary>{moreLabel}</summary>
            <p>{more}</p>
          </details>
        ) : null}
      </div>
      {action ? <div className="info-card-action">{action}</div> : null}
    </article>
  )
}
