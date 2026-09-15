import Image from 'next/image'

export type TopicHeroImage =
  | {
      src: string
      alt: string
      /** Photographs sit in the dark framed visual. */
      presentation?: 'photo'
    }
  | {
      src: string
      alt: string
      /** Transparent marks sit on the page background, without the photo frame. */
      presentation: 'mark'
      width: number
      height: number
    }

export interface TopicHeroProps {
  kicker: string
  title: string
  lead?: string
  notice?: string
  /** Compact framing for pages whose primary content is an interactive tool. */
  variant?: 'default' | 'compact'
  image?: TopicHeroImage
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
        image?.presentation === 'mark' && 'topic-hero-with-mark',
        variant === 'compact' && 'topic-hero-compact',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {image?.presentation === 'mark' ? (
        <>
          <p className="topic-kicker">{kicker}</p>
          <div className="topic-hero-mark-body">
            <div className="topic-hero-copy">
              <h1>{title}</h1>
              {lead ? <p className="topic-lead">{lead}</p> : null}
              {notice ? <p className="topic-notice">{notice}</p> : null}
            </div>
            <div className="topic-hero-mark">
              <Image
                alt={image.alt}
                className="topic-hero-mark-image"
                height={image.height}
                priority
                src={image.src}
                width={image.width}
              />
            </div>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </header>
  )
}
