'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

import { ResearcherCard, type ResearcherCardProps } from './ResearcherCard'

export interface TeamGalleryProps<T extends ResearcherCardProps = ResearcherCardProps> {
  label: string
  emptyMessage: string
  hint: string
  people: readonly T[]
  /**
   * Overrides how a person's slide renders — defaults to a plain `ResearcherCard`. This is how a
   * caller (the ROSAC admin page) wraps a card with edit affordances without this component
   * knowing anything about "Modo edición"; `/nosotros` never passes it and keeps the default.
   */
  renderPerson?: (person: T, index: number) => ReactNode
  /** An extra slide appended after the people, e.g. an "add new" prompt in edit mode. */
  trailingSlide?: ReactNode
}

/**
 * A scroll-snap track rather than an index driven carousel: every portrait stays in the DOM,
 * keyboard and touch scrolling work natively, and there is no slide state, live region or focus
 * management to get wrong. `/radioastronomia` is in the zero tolerance axe sweep and index
 * carousels are the usual source of violations there. `/nosotros` reuses the same gallery.
 *
 * Each person is a `ResearcherCard`. The portrait is decorative (`alt=""`) because the name, role,
 * email and institution are rendered as real HTML on the front; the description is on the back after a
 * flip.
 */
export function TeamGallery<T extends ResearcherCardProps = ResearcherCardProps>({
  label,
  emptyMessage,
  hint,
  people,
  renderPerson,
  trailingSlide,
}: TeamGalleryProps<T>) {
  const trackRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const track = trackRef.current

    if (!track) {
      return
    }

    track.scrollLeft = 0
    const frame = requestAnimationFrame(() => {
      track.scrollLeft = 0
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current

    if (!track) {
      return
    }

    // Scroll by roughly one card so the snap points do the final alignment.
    track.scrollBy({ behavior: 'smooth', left: direction * (track.clientWidth * 0.6) })
  }

  if (people.length === 0 && !trailingSlide) {
    return (
      <p className="content-empty" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="team-gallery">
      <p className="team-gallery-hint">{hint}</p>
      {people.length === 0 ? (
        <p className="content-empty" role="status">
          {emptyMessage}
        </p>
      ) : null}
      {/* Focusable so the scrollable region is reachable by keyboard, which axe requires. */}
      <ul aria-label={label} className="team-gallery-track" ref={trackRef} tabIndex={0}>
        {people.map((person, index) => (
          <li className="team-gallery-slide" key={person.email ?? person.name}>
            {renderPerson ? (
              renderPerson(person, index)
            ) : (
              <ResearcherCard
                description={person.description}
                email={person.email}
                name={person.name}
                role={person.role}
                institution={person.institution}
                src={person.src}
              />
            )}
          </li>
        ))}
        {trailingSlide ? <li className="team-gallery-slide">{trailingSlide}</li> : null}
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
