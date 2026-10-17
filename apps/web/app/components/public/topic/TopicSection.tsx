import { useId, type ReactNode } from 'react'

export interface TopicSectionProps {
  id?: string
  index?: string
  title: string
  titleId?: string
  /**
   * The language `title` is written in, when it can differ from the page's, as in database
   * content (from `contentLangAttribute`).
   */
  titleLang?: string
  badge?: string
  intro?: string
  className?: string
  featured?: boolean
  wide?: boolean
  children?: ReactNode
}

export function TopicSection({
  id,
  index,
  title,
  titleId,
  titleLang,
  badge,
  intro,
  className,
  featured = false,
  wide = false,
  children,
}: TopicSectionProps) {
  const generatedTitleId = useId()
  const headingId = titleId ?? generatedTitleId
  const classes = ['topic-section', 'page-width', wide ? 'topic-section-lede' : '', className]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <div className="topic-section-heading">
        <h2 id={headingId} lang={titleLang}>
          {index ? <span className="topic-section-index">{index}.</span> : null} {title}
        </h2>
        {badge ? <span className="topic-badge">{badge}</span> : null}
      </div>
      {intro ? <p className="topic-intro">{intro}</p> : null}
      {children}
    </>
  )

  return (
    <section aria-labelledby={headingId} className={classes} id={id}>
      {featured ? <div className="topic-highlight">{content}</div> : content}
    </section>
  )
}
