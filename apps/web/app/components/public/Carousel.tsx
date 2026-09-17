'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'

import styles from './Carousel.module.css'

export interface CarouselImage {
  src: string
  alt: string
}

export interface CarouselGroup {
  id: string
  title: string
  description: string
  images: readonly [CarouselImage, ...CarouselImage[]]
}

export interface CarouselProps {
  /** The groups paged through with the secondary controls (e.g. construction stages). */
  groups: readonly [CarouselGroup, ...CarouselGroup[]]
  /** Accessible name for the carousel region: what it shows, not how to use it. */
  ariaLabel: string
  /** Noun for a group in the live-region announcement, e.g. "Etapa" or "Sección". */
  groupNoun?: string
  /** Noun for a photo in the live-region announcement, e.g. "Fotografía". */
  photoNoun?: string
  /** Label for the secondary button that moves to the previous group. */
  previousGroupLabel?: string
  /** Label for the secondary button that moves to the next group. */
  nextGroupLabel?: string
  /** Label for the overlay button that moves to the previous photo. */
  previousPhotoLabel?: string
  /** Label for the overlay button that moves to the next photo. */
  nextPhotoLabel?: string
}

/**
 * A manual, non-autoplaying carousel: a primary photo with overlay
 * previous/next controls that loop within the current group, paired with a
 * secondary title/description panel and buttons that page between groups
 * and reset back to each group's first photo.
 *
 * Built for the ROSAC construction process (see ConstructionCarousel), but
 * generic over its content -- and over the copy used for its accessible
 * labels and live-region announcement -- so other sections can reuse it
 * with their own data instead of re-implementing this interaction.
 */
export function Carousel({
  groups,
  ariaLabel,
  groupNoun = 'Etapa',
  photoNoun = 'Fotografía',
  previousGroupLabel = 'Etapa anterior',
  nextGroupLabel = 'Etapa siguiente',
  previousPhotoLabel = 'Fotografía anterior',
  nextPhotoLabel = 'Fotografía siguiente',
}: CarouselProps) {
  const [{ groupIndex, imageIndex }, setPosition] = useState({ groupIndex: 0, imageIndex: 0 })

  const group = groups[groupIndex]!
  const image = group.images[imageIndex]!

  function movePhoto(direction: -1 | 1) {
    setPosition((position) => ({
      ...position,
      imageIndex: (position.imageIndex + direction + group.images.length) % group.images.length,
    }))
  }

  return (
    <div
      className={styles.carousel}
      role="group"
      aria-roledescription="carrusel"
      aria-label={ariaLabel}
    >
      <div className={styles.content}>
        <div className={styles.imageFrame}>
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 1120px) calc(100vw - 32px), (max-width: 1400px) 60vw, 820px"
            className={styles.image}
          />
          {group.images.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.photoControl} ${styles.photoPrevious}`}
                aria-label={previousPhotoLabel}
                onClick={() => movePhoto(-1)}
              >
                <ChevronLeft aria-hidden="true" size={26} />
              </button>
              <button
                type="button"
                className={`${styles.photoControl} ${styles.photoNext}`}
                aria-label={nextPhotoLabel}
                onClick={() => movePhoto(1)}
              >
                <ChevronRight aria-hidden="true" size={26} />
              </button>
            </>
          )}
        </div>
        <div className={styles.panel}>
          <h3>{group.title}</h3>
          <p className={styles.description}>{group.description}</p>
          <div className={styles.actions}>
            <div className={styles.groupControls}>
              <Button
                variant="secondary"
                className={styles.control}
                disabled={groupIndex === 0}
                onClick={() => setPosition({ groupIndex: groupIndex - 1, imageIndex: 0 })}
                icon={<ChevronLeft aria-hidden="true" size={18} />}
              >
                {previousGroupLabel}
              </Button>
              <Button
                variant="secondary"
                className={styles.control}
                disabled={groupIndex === groups.length - 1}
                onClick={() => setPosition({ groupIndex: groupIndex + 1, imageIndex: 0 })}
                icon={<ChevronRight aria-hidden="true" size={18} />}
              >
                {nextGroupLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <p className={styles.srOnly} role="status" aria-atomic="true">
        {groupNoun} {groupIndex + 1} de {groups.length}: {group.title}. {photoNoun} {imageIndex + 1}{' '}
        de {group.images.length}.
      </p>
    </div>
  )
}
