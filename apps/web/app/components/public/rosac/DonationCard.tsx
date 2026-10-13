import Image from 'next/image'

import type { RosacDonation } from '@/app/lib/rosac'

export interface DonationCardProps {
  donation: RosacDonation
}

/**
 * A donation announcement, styled like the news/academic-activity cards
 * (`.surface-card.news-card`) but without their date/badge/link fields —
 * there is no per-donation detail page, so the full write-up shows here
 * instead of being clamped behind a "read more" link.
 */
export function DonationCard({ donation }: DonationCardProps) {
  return (
    <article className="surface-card news-card">
      <div className="news-card-image">
        <Image
          alt={donation.image.alt}
          fill
          sizes="(max-width: 768px) 100vw, 320px"
          src={donation.image.src}
        />
      </div>

      <div className="news-card-content">
        <h3>{donation.title}</h3>
        <p className="donation-card-description">{donation.description}</p>
      </div>
    </article>
  )
}
