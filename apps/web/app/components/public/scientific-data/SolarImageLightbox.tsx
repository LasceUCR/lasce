'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Lightbox } from '../Lightbox'
import type { ScientificImage } from '@/app/lib/scientific-data'

/** A solar image with the alternative text the page wrote for it. */
export interface DescribedSolarImage extends ScientificImage {
  alt: string
}

export interface SolarImageLightboxProps {
  image: DescribedSolarImage
  /** One-based place of `image` in the sequence, ready to display. */
  position: number
  /** Images the arrows page through. */
  total: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

export function formatTimestamp(timestamp: string) {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
}

/**
 * Full-screen view of one solar image. The dialog behaviour lives in the shared
 * `Lightbox`; this supplies the stage and the translated copy. The image is
 * contained rather than cropped, because the whole solar disc is the content.
 */
export function SolarImageLightbox({
  image,
  position,
  total,
  onClose,
  onPrevious,
  onNext,
}: SolarImageLightboxProps) {
  const t = useTranslations('solarImageLightbox')
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const time = formatTimestamp(image.timestamp)

  return (
    <Lightbox
      announcement={t('announcement', { position, total, time })}
      describedBy={descriptionId}
      labelledBy={titleId}
      labels={{ close: t('close'), previous: t('previous'), next: t('next') }}
      onClose={onClose}
      onNext={onNext}
      onPrevious={onPrevious}
      position={position}
      positionLabel={t('position', { position, total })}
      total={total}
    >
      <figure className="lightbox-stage">
        <div className="lightbox-media lightbox-media-contain">
          <Image
            alt={image.alt}
            height={1024}
            sizes="(max-width: 1120px) 100vw, 900px"
            src={image.imageUrl}
            width={1024}
          />
        </div>

        <figcaption className="lightbox-meta">
          <span className="lightbox-kicker">{t('kicker')}</span>
          <h2 id={titleId}>{time}</h2>
          <p id={descriptionId}>{image.alt}</p>
        </figcaption>
      </figure>
    </Lightbox>
  )
}
