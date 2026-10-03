import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

// `DonationCard.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { DonationCard, type DonationCardProps } from './DonationCard'
import { Default } from './DonationCard.stories'

const defaultArgs = Default.args as DonationCardProps

describe('DonationCard', () => {
  test('shows the donation title, full description and photo', () => {
    render(<DonationCard {...defaultArgs} />)

    const { donation } = defaultArgs
    expect(screen.getByRole('heading', { level: 3, name: donation.title })).toBeInTheDocument()
    expect(screen.getByText(donation.description)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: donation.image.alt })).toHaveAttribute(
      'src',
      donation.image.src,
    )
  })
})
