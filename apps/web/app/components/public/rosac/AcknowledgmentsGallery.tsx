'use client'

import Image from 'next/image'

import type { RosacAcknowledgment } from '@/app/lib/rosac'

export interface AcknowledgmentsGalleryProps {
  label: string
  institutions: readonly RosacAcknowledgment[]
}

/**
 * A wrapping grid of institution logos — cards flow onto new rows instead of
 * scrolling horizontally. Each logo links out to the institution's own site;
 * an institution without a confirmed `href` yet renders as a plain,
 * non-interactive tile rather than guessing a URL.
 */
export function AcknowledgmentsGallery({ label, institutions }: AcknowledgmentsGalleryProps) {
  return (
    <ul aria-label={label} className="acknowledgments-grid">
      {institutions.map((institution) => (
        <li className="acknowledgments-tile" key={institution.name}>
          {institution.href ? (
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
    </ul>
  )
}
