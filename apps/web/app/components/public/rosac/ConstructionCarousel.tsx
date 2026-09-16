'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import type { ConstructionContent } from '@/app/lib/rosac-construction'

import styles from './ConstructionCarousel.module.css'

export interface ConstructionCarouselProps {
  stages: ConstructionContent['stages']
}

export function ConstructionCarousel({ stages }: ConstructionCarouselProps) {
  const [{ stageIndex, imageIndex }, setPosition] = useState({ stageIndex: 0, imageIndex: 0 })

  const stage = stages[stageIndex]!
  const image = stage.images[imageIndex]!
  function movePhoto(direction: -1 | 1) {
    setPosition((position) => ({
      ...position,
      imageIndex: (position.imageIndex + direction + stage.images.length) % stage.images.length,
    }))
  }

  return (
    <div
      className={styles.carousel}
      role="group"
      aria-roledescription="carrusel"
      aria-label="Proceso de construcción del ROSAC"
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
          {stage.images.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.photoControl} ${styles.photoPrevious}`}
                aria-label="Fotografía anterior"
                onClick={() => movePhoto(-1)}
              >
                <ChevronLeft aria-hidden="true" size={26} />
              </button>
              <button
                type="button"
                className={`${styles.photoControl} ${styles.photoNext}`}
                aria-label="Fotografía siguiente"
                onClick={() => movePhoto(1)}
              >
                <ChevronRight aria-hidden="true" size={26} />
              </button>
            </>
          )}
        </div>
        <div className={styles.panel}>
          <h3>{stage.title}</h3>
          <p className={styles.description}>{stage.description}</p>
          <div className={styles.actions}>
            <div className={styles.stageControls}>
              <Button
                variant="secondary"
                className={styles.control}
                disabled={stageIndex === 0}
                onClick={() => setPosition({ stageIndex: stageIndex - 1, imageIndex: 0 })}
                icon={<ChevronLeft aria-hidden="true" size={18} />}
              >
                Etapa anterior
              </Button>
              <Button
                variant="secondary"
                className={styles.control}
                disabled={stageIndex === stages.length - 1}
                onClick={() => setPosition({ stageIndex: stageIndex + 1, imageIndex: 0 })}
                icon={<ChevronRight aria-hidden="true" size={18} />}
              >
                Etapa siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>
      <p className={styles.srOnly} role="status" aria-atomic="true">
        Etapa {stageIndex + 1} de {stages.length}: {stage.title}. Fotografía {imageIndex + 1} de{' '}
        {stage.images.length}.
      </p>
    </div>
  )
}
