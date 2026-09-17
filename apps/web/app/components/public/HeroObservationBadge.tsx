'use client'

import { useEffect, useRef, useState } from 'react'

import type { LatestSuviObservation } from '@/app/components/public/solar-astrophysics/useLatestSuviObservation'

export interface HeroObservationBadgeProps {
  observation: LatestSuviObservation
}

/**
 * "En vivo" badge over the Sun image animating behind the hero. `<details>`/
 * `<summary>` gives the disclosure full keyboard support and correct expanded
 * state for free — the same native pattern `InfoCard`'s "Más información"
 * already uses elsewhere in this app — instead of a hand-rolled tooltip that
 * would only open on mouse hover. Its `open` state is mirrored into React so
 * the panel can also be dismissed by clicking outside it, pressing Escape, or
 * activating its own close button, on top of the native toggle behavior.
 */
export function HeroObservationBadge({ observation }: HeroObservationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function closeIfOutside(event: MouseEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        detailsRef.current?.querySelector('summary')?.focus()
      }
    }

    document.addEventListener('mousedown', closeIfOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeIfOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <details
      className="hero-live"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      open={isOpen}
      ref={detailsRef}
    >
      <summary
        aria-label="Imagen del Sol en vivo. Mostrar fecha y fuente de la observación."
        className="hero-live-trigger"
      >
        <span aria-hidden="true" className="hero-live-dot" />
        En vivo
      </summary>
      <div className="hero-live-panel">
        <button
          aria-label="Cerrar"
          className="hero-live-close"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          ×
        </button>
        <p className="hero-live-text hero-live-title">Imagen del Sol en tiempo real</p>
        <p className="hero-live-text hero-observation-time">
          {observation.status === 'ready' ? (
            <>
              Observado el{' '}
              <time dateTime={observation.observedAtIso}>{observation.observedAtLabel}</time>
            </>
          ) : (
            'Actualizando la imagen más reciente del Sol…'
          )}
        </p>
        <p className="hero-live-text hero-observation-source">SUVI 195 Å · NOAA/GOES</p>
      </div>
    </details>
  )
}
