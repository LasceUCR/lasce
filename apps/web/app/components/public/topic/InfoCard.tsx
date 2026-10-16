import { useId, type ReactNode } from 'react'

export interface InfoCardProps {
  title: string
  description: ReactNode
  icon: ReactNode
  more?: string
  moreLabel?: string
  layout?: 'vertical' | 'horizontal'
  headingLevel?: 2 | 3
  action?: ReactNode
  /**
   * The language of `title`, `description` and `more` when it can differ from the page's, as for
   * database content shown in a bilingual site: `'es'`, `'en'`, or `''` for text whose language
   * is unknown. Set on the text only, so the icon and the action keep the page's language.
   */
  lang?: string
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
  lang,
}: InfoCardProps) {
  const titleId = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <article aria-labelledby={titleId} className={`surface-card info-card info-card-${layout}`}>
      <span className="info-card-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="info-card-content" lang={lang}>
        <Heading id={titleId}>{title}</Heading>
        {typeof description === 'string' ? <p>{description}</p> : description}
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
