'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useRef, type ReactNode } from 'react'

import type { RosacAcknowledgment } from '@/app/lib/rosac'

export interface AcknowledgmentsGalleryProps {
  label: string
  institutions: readonly RosacAcknowledgment[]
  /**
   * Overrides how an institution slide renders — defaults to a plain `.acknowledgments-card`.
   * This is how the caller wraps cards with edit affordances in edit mode.
   */
  renderInstitution?: (institution: RosacAcknowledgment, index: number) => ReactNode
  /** An extra slide appended after institutions, e.g. an "add new" prompt in edit mode. */
  trailingSlide?: ReactNode
}

/**
 * A scroll-snap track of institution logos, the same interaction pattern as
 * `TeamGallery` (native keyboard/touch scrolling, every card stays in the
 * DOM) but with square cards sized for a logo and name rather than a
 * researcher profile.
 */
export function AcknowledgmentsGallery({
  label,
  institutions,
  renderInstitution,
  trailingSlide,
}: AcknowledgmentsGalleryProps) {
  const trackRef = useRef<HTMLUListElement>(null)

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current

    if (!track || typeof track.scrollBy !== 'function') {
      return
    }

    track.scrollBy({ behavior: 'smooth', left: direction * (track.clientWidth * 0.6) })
  }

  return (
    <div className="acknowledgments-gallery">
      {/* Focusable so the scrollable region is reachable by keyboard, which axe requires. */}
      <ul aria-label={label} className="acknowledgments-track" ref={trackRef} tabIndex={0}>
        {institutions.map((institution, index) => (
          <li className="acknowledgments-slide" key={institution.id ?? institution.name}>
            {renderInstitution ? (
              renderInstitution(institution, index)
            ) : (
              <div className="acknowledgments-card">
                <div className="acknowledgments-logo">
                  <Image alt={institution.logo.alt} fill sizes="160px" src={institution.logo.src} />
                </div>
                <p className="acknowledgments-name">{institution.name}</p>
              </div>
            )}
          </li>
        ))}
        {trailingSlide ? <li className="acknowledgments-slide">{trailingSlide}</li> : null}
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
