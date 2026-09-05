import Image from 'next/image'

export interface TopicHeroProps {
  kicker: string
  title: string
  lead?: string
  notice?: string
  image?: {
    src: string
    alt: string
  }
}

export function TopicHero({ kicker, title, lead, notice, image }: TopicHeroProps) {
  return (
    <header className={image ? 'topic-hero' : 'topic-hero topic-hero-copy-only'}>
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
