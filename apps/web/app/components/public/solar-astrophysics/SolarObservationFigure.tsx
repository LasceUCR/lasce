'use client'

import { ArrowRight, Sun } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'

import { useLatestSuviObservation } from './useLatestSuviObservation'

export interface SolarObservationFigureProps {
  content: {
    alt: string
    loading: string
    unavailable: string
    observedLabel: string
    source: string
    dataLink: { title: string; description: string; label: string; href: string }
  }
}

export function SolarObservationFigure({ content }: SolarObservationFigureProps) {
  const observation = useLatestSuviObservation()
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = observation.status === 'ready' && !imageFailed

  return (
    <div className="solar-observation-layout">
      <figure className="topic-figure solar-observation-figure">
        <div className="topic-figure-frame solar-observation-frame">
          {hasImage ? (
            <img
              alt={content.alt}
              className="topic-figure-image"
              onError={() => setImageFailed(true)}
              src={observation.src}
            />
          ) : (
            <div className="solar-observation-placeholder" role="status">
              <Sun aria-hidden="true" size={40} strokeWidth={1.4} />
              <p>{observation.status === 'loading' ? content.loading : content.unavailable}</p>
            </div>
          )}
        </div>
      </figure>
      <aside className="solar-data-cta">
        <h3>{content.dataLink.title}</h3>
        <p>{content.dataLink.description}</p>
        <div className="solar-observation-caption">
          {observation.status === 'ready' && !imageFailed ? (
            <span>
              {content.observedLabel}{' '}
              <time dateTime={observation.observedAtIso}>{observation.observedAtLabel}</time>
            </span>
          ) : null}
          <span>{content.source}</span>
        </div>
        <Button
          href={content.dataLink.href}
          icon={<ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />}
          variant="secondary"
        >
          {content.dataLink.label}
        </Button>
      </aside>
    </div>
  )
}
