import type { CSSProperties } from 'react'
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
      /**
       * An optional real photograph shown below the heading, as a wide
       * framed banner — the mark moves down next to the lead line below it.
       */
      photo?: { src: string; alt: string }
    }
  | {
      src: string
      alt: string
      /**
       * A wide photograph below the heading that already carries the page's logo, so no separate
       * mark is shown. Wide screens show it whole at its own proportions; narrow screens crop it
       * into a taller frame and keep `focus` in view.
       */
      presentation: 'banner'
      width: number
      height: number
      /** Side kept visible when narrow screens crop the banner, e.g. where the logo sits. */
      focus?: 'left' | 'center' | 'right'
      /**
       * Optional image for narrow screens (760px or less), e.g. a version with the logo centered.
       * It replaces the main image there and is cropped around its center; `focus` then only
       * applies to wider screens.
       */
      mobileSrc?: string
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
        (image?.presentation === 'mark' || image?.presentation === 'banner') &&
          'topic-hero-with-mark',
        variant === 'compact' && 'topic-hero-compact',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {image?.presentation === 'banner' ? (
        <div className="topic-hero-mark-body">
          <div className="topic-hero-mark-heading">
            <p className="topic-kicker">{kicker}</p>
            <h1>{title}</h1>
          </div>
          <div
            className={[
              'topic-hero-mark-photo',
              'topic-hero-banner',
              image.mobileSrc && 'topic-hero-banner-has-mobile',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                aspectRatio: `${image.width} / ${image.height}`,
                // Lets the stylesheet cap the banner's height by narrowing it in proportion, so
                // the whole image stays visible instead of being cropped.
                '--topic-hero-banner-ratio': image.width / image.height,
              } as CSSProperties
            }
          >
            <Image
              alt={image.alt}
              className="topic-hero-mark-photo-image topic-hero-banner-main"
              fill
              priority
              sizes="(max-width: 1332px) 100vw, 1332px"
              src={image.src}
              style={{ objectPosition: `${image.focus ?? 'center'} center` }}
            />
            {/* Only one of the two is displayed at a time (see globals.css). The hidden one is
                display: none, so it is out of the accessibility tree and, being lazy, the mobile
                image is not downloaded on wide screens. */}
            {image.mobileSrc ? (
              <Image
                alt={image.alt}
                className="topic-hero-mark-photo-image topic-hero-banner-mobile"
                fill
                sizes="100vw"
                src={image.mobileSrc}
              />
            ) : null}
          </div>
          {lead ? <p className="topic-lead">{lead}</p> : null}
          {notice ? <p className="topic-notice">{notice}</p> : null}
        </div>
      ) : image?.presentation === 'mark' ? (
        <div className="topic-hero-mark-body">
          <div className="topic-hero-mark-heading">
            <p className="topic-kicker">{kicker}</p>
            <h1>{title}</h1>
          </div>
          {image.photo ? (
            <div className="topic-hero-mark-photo">
              <Image
                alt={image.photo.alt}
                className="topic-hero-mark-photo-image"
                fill
                priority
                sizes="(max-width: 1332px) 100vw, 1332px"
                src={image.photo.src}
              />
            </div>
          ) : null}
          <div className="topic-hero-mark-footer">
            <Image
              alt={image.alt}
              className="topic-hero-mark-logo"
              height={image.height}
              priority={!image.photo}
              src={image.src}
              width={image.width}
            />
            {lead ? <p className="topic-lead">{lead}</p> : null}
          </div>
          {notice ? <p className="topic-notice">{notice}</p> : null}
        </div>
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
