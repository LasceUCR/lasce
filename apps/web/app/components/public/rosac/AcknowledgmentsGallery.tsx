'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

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
 * A wrapping grid of institution logos — cards flow onto new rows instead of
 * scrolling horizontally. Each logo links out to the institution's own site;
 * an institution without a confirmed `href` yet renders as a plain,
 * non-interactive tile rather than guessing a URL.
 */
export function AcknowledgmentsGallery({
  label,
  institutions,
  renderInstitution,
  trailingSlide,
}: AcknowledgmentsGalleryProps) {
  return (
    <ul aria-label={label} className="acknowledgments-grid">
      {institutions.map((institution, index) => (
        <li className="acknowledgments-tile" key={institution.id ?? institution.name}>
          {renderInstitution ? (
            renderInstitution(institution, index)
          ) : institution.href ? (
            <a
              className="acknowledgments-card"
              href={institution.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="acknowledgments-logo">
                <Image alt={institution.logo.alt} fill sizes="160px" src={institution.logo.src} />
              </div>
            </a>
          ) : (
            <div className="acknowledgments-card acknowledgments-card-static">
              <div className="acknowledgments-logo">
                <Image alt={institution.logo.alt} fill sizes="160px" src={institution.logo.src} />
              </div>
            </div>
          )}
        </li>
      ))}
      {trailingSlide ? <li className="acknowledgments-tile">{trailingSlide}</li> : null}
    </ul>
  )
}
