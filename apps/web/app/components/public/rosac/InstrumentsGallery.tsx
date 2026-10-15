'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Children, useRef, type ReactNode } from 'react'

export interface InstrumentsGalleryProps {
  label: string
  children: ReactNode
  trailingSlide?: ReactNode
}

/**
 * A scroll-snap track for instrument cards when there are more than 3 instruments
 * or when adding new instruments in edit mode. Follows the same interaction pattern
 * as `TeamGallery` and `AcknowledgmentsGallery`.
 */
export function InstrumentsGallery({ label, children, trailingSlide }: InstrumentsGalleryProps) {
  const trackRef = useRef<HTMLUListElement>(null)

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current
    if (!track || typeof track.scrollBy !== 'function') return
    track.scrollBy({ behavior: 'smooth', left: direction * (track.clientWidth * 0.6) })
  }

  return (
    <div className="instruments-gallery">
      <ul aria-label={label} className="instruments-track" ref={trackRef} tabIndex={0}>
        {Children.map(children, (child, index) =>
          child ? (
            <li className="instruments-slide" key={index}>
              {child}
            </li>
          ) : null,
        )}
        {trailingSlide ? <li className="instruments-slide">{trailingSlide}</li> : null}
      </ul>

      <div className="team-gallery-controls">
        <button
          aria-label="Anterior"
          className="team-gallery-control"
          onClick={() => scrollByCards(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <button
          aria-label="Siguiente"
          className="team-gallery-control"
          onClick={() => scrollByCards(1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
