'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCallback, useRef, useState } from 'react'
import type { Ref } from 'react'

import { Skeleton } from '@/app/components/public/skeleton/Skeleton'

import { SolarImageLightbox, formatTimestamp, type DescribedSolarImage } from './SolarImageLightbox'
import type { ScientificImage } from '@/app/lib/scientific-data'

export interface SuviImageSequenceProps {
  images: ScientificImage[]
  /** The band, in the visitor's language; it names every image's alternative text. */
  productName: string
  /** The GOES spacecraft that took the images, when the result says. */
  satellite?: number
  variant?: 'grid' | 'strip'
}

const closed = -1

interface SolarImageProps {
  image: DescribedSolarImage
  strip: boolean
  onOpen: () => void
  triggerRef: Ref<HTMLButtonElement>
}

function SolarImage({ image, strip, onOpen, triggerRef }: SolarImageProps) {
  const t = useTranslations('solarImageLightbox')
  const tImages = useTranslations('scientificData.images')
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <figure>
      {/* Busy until the image arrives: a placeholder fills the frame meanwhile, and the loading
          message is only announced. A failure replaces both with a message everyone can read. */}
      <div
        aria-busy={state === 'loading' || undefined}
        className="data-image-frame"
        data-state={state}
      >
        {state === 'loading' ? <Skeleton className="data-image-skeleton" tone="dark" /> : null}
        {state !== 'loaded' ? (
          <p role="status" className={state === 'error' ? 'data-image-status' : 'sr-only'}>
            {state === 'error' ? tImages('unavailable') : tImages('loading')}
          </p>
        ) : null}
        {state !== 'error' ? (
          <Image
            alt={image.alt}
            height={512}
            sizes={
              strip
                ? '(max-width: 600px) 70vw, (max-width: 900px) 30vw, 210px'
                : '(max-width: 580px) 88vw, (max-width: 900px) 42vw, 280px'
            }
            loading={strip ? 'eager' : 'lazy'}
            src={image.imageUrl}
            width={512}
            onLoad={() => setState('loaded')}
            onError={() => setState('error')}
          />
        ) : null}
        {state !== 'error' ? (
          <button
            aria-label={t('open', { time: formatTimestamp(image.timestamp) })}
            className="data-image-button"
            onClick={onOpen}
            ref={triggerRef}
            type="button"
          />
        ) : null}
      </div>
      <figcaption>{formatTimestamp(image.timestamp)}</figcaption>
    </figure>
  )
}

/**
 * Owns the lightbox index, so the thumbnails and the dialog agree on which image
 * is open and focus can return to the thumbnail that opened it.
 */
export function SuviImageSequence({
  images: sequence,
  productName,
  satellite,
  variant = 'grid',
}: SuviImageSequenceProps) {
  const tImages = useTranslations('scientificData.images')
  const observer = satellite ? `GOES-${satellite}` : 'GOES'
  const images: DescribedSolarImage[] = sequence.map((image) => ({
    ...image,
    alt: tImages('alt', {
      product: productName,
      observer,
      time: image.timestamp.slice(11, 16),
    }),
  }))
  const [openIndex, setOpenIndex] = useState(closed)
  const triggers = useRef<(HTMLButtonElement | null)[]>([])

  const close = useCallback(() => {
    // The dialog closes itself natively before this runs, so the document is no
    // longer inert and the thumbnail can take focus back.
    triggers.current[openIndex]?.focus()
    setOpenIndex(closed)
  }, [openIndex])

  const showPrevious = useCallback(() => {
    setOpenIndex((current) => (current - 1 + images.length) % images.length)
  }, [images.length])

  const showNext = useCallback(() => {
    setOpenIndex((current) => (current + 1) % images.length)
  }, [images.length])

  const openImage = openIndex === closed ? undefined : images[openIndex]

  return (
    <>
      <ul
        aria-label={tImages('sequenceLabel')}
        className={`data-image-grid${variant === 'strip' ? ' data-image-strip' : ''}`}
      >
        {images.map((image, index) => (
          <li key={`${image.timestamp}-${image.imageUrl}`}>
            <SolarImage
              image={image}
              onOpen={() => setOpenIndex(index)}
              strip={variant === 'strip'}
              triggerRef={(element) => {
                triggers.current[index] = element
              }}
            />
          </li>
        ))}
      </ul>

      {openImage ? (
        <SolarImageLightbox
          image={openImage}
          onClose={close}
          onNext={showNext}
          onPrevious={showPrevious}
          position={openIndex + 1}
          total={images.length}
        />
      ) : null}
    </>
  )
}
