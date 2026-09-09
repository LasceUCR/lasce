'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

import type { TeamMember } from '@/app/lib/rosac'

import { ResearcherCard } from './ResearcherCard'

export interface TeamGalleryProps {
  label: string
  emptyMessage: string
  people: readonly TeamMember[]
}

/**
 * A scroll-snap track rather than an index driven carousel: every portrait stays in the DOM,
 * keyboard and touch scrolling work natively, and there is no slide state, live region or focus
 * management to get wrong. `/radioastronomia` is in the zero tolerance axe sweep and index
 * carousels are the usual source of violations there.
 *
 * Each person is a `ResearcherCard`. The portrait is decorative (`alt=""`) because the name, role,
 * institution and description are rendered as real HTML beside it.
 */
export function TeamGallery({ label, emptyMessage, people }: TeamGalleryProps) {
  const trackRef = useRef<HTMLUListElement>(null)

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current

    if (!track) {
      return
    }

    // Scroll by roughly one card so the snap points do the final alignment.
    track.scrollBy({ behavior: 'smooth', left: direction * (track.clientWidth * 0.6) })
  }

  if (people.length === 0) {
    return (
      <p className="content-empty" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="team-gallery">
      {/* Focusable so the scrollable region is reachable by keyboard, which axe requires. */}
      <ul aria-label={label} className="team-gallery-track" ref={trackRef} tabIndex={0}>
        {people.map((person) => (
          <li className="team-gallery-slide" key={person.src}>
            <ResearcherCard
              description={person.description}
              email={person.email}
              name={person.name}
              role={person.role}
              institution={person.institution}
              src={person.src}
            />
          </li>
        ))}
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
