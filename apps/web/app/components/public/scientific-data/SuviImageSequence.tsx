'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { ScientificImage } from '@/app/lib/scientific-data'

export interface SuviImageSequenceProps {
  images: ScientificImage[]
  variant?: 'grid' | 'strip'
}

function formatTimestamp(timestamp: string) {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
}

interface SolarImageProps {
  image: ScientificImage
  strip: boolean
}

function SolarImage({ image, strip }: SolarImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <figure>
      <div className="data-image-frame" data-state={state}>
        {state !== 'loaded' ? (
          <p role="status" className="data-image-status">
            {state === 'error'
              ? 'Esta imagen solar no está disponible. Consulte otra banda o intente nuevamente.'
              : 'Cargando imagen solar…'}
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
      </div>
      <figcaption>{formatTimestamp(image.timestamp)}</figcaption>
    </figure>
  )
}

export function SuviImageSequence({ images, variant = 'grid' }: SuviImageSequenceProps) {
  return (
    <ul
      aria-label="Secuencia de imágenes solares"
      className={`data-image-grid${variant === 'strip' ? ' data-image-strip' : ''}`}
    >
      {images.map((image) => (
        <li key={`${image.timestamp}-${image.imageUrl}`}>
          <SolarImage image={image} strip={variant === 'strip'} />
        </li>
      ))}
    </ul>
  )
}
