'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

import type { TeamMember } from '@/app/lib/nosotros'

export interface TeamGalleryProps {
  label: string
  people: readonly TeamMember[]
}

/**
 * A scroll-snap track rather than an index driven carousel: every portrait stays in the DOM,
 * keyboard and touch scrolling work natively, and there is no slide state, live region or focus
 * management to get wrong. `/nosotros` is in the zero tolerance axe sweep and index carousels are
 * the usual source of violations there.
 *
 * Names are visible captions, not alt text. That keeps them selectable, translatable and
 * indexable, and it stops a screen reader announcing each person twice, so the portrait beside
 * the caption is decorative.
 */
export function TeamGallery({ label, people }: TeamGalleryProps) {
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
    return null
  }

  return (
    <div className="team-gallery">
      {/* Focusable so the scrollable region is reachable by keyboard, which axe requires. */}
      <ul aria-label={label} className="team-gallery-track" ref={trackRef} tabIndex={0}>
        {people.map((person) => (
          <li className="team-gallery-slide" key={person.src}>
            <figure>
              <span className="team-gallery-frame">
                <Image
                  alt=""
                  className="team-gallery-photo"
                  fill
                  sizes="(max-width: 760px) 60vw, 240px"
                  src={person.src}
                />
              </span>
              <figcaption>
                <span className="team-gallery-name">{person.name}</span>
                {person.role ? <span className="team-gallery-role">{person.role}</span> : null}
              </figcaption>
            </figure>
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
