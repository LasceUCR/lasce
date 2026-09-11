import Image from 'next/image'

export interface TopicHeroProps {
  kicker: string
  title: string
  lead?: string
  notice?: string
  /** Compact framing for pages whose primary content is an interactive tool. */
  variant?: 'default' | 'compact'
  image?: {
    src: string
    alt: string
  }
}

export function TopicHero({
  kicker,
  title,
  lead,
  notice,
  image,
  variant = 'default',
}: TopicHeroProps) {
  return (
    <header
      className={[
        'topic-hero',
        !image && 'topic-hero-copy-only',
        variant === 'compact' && 'topic-hero-compact',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="topic-hero-copy">
        <p className="topic-kicker">{kicker}</p>
        <h1>{title}</h1>
        {lead ? <p className="topic-lead">{lead}</p> : null}
        {notice ? <p className="topic-notice">{notice}</p> : null}
      </div>
      {image ? (
        <div className="topic-hero-visual">
          <Image
            alt={image.alt}
            className="topic-hero-image"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 42vw"
            src={image.src}
          />
        </div>
      ) : null}
    </header>
  )
}
