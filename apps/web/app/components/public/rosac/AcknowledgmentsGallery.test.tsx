import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

// `AcknowledgmentsGallery.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import type { RosacAcknowledgment } from '@/app/lib/rosac'

import { AcknowledgmentsGallery, type AcknowledgmentsGalleryProps } from './AcknowledgmentsGallery'
import { Default, SingleInstitution } from './AcknowledgmentsGallery.stories'

const defaultArgs = Default.args as AcknowledgmentsGalleryProps
const singleArgs = SingleInstitution.args as AcknowledgmentsGalleryProps

const linkedInstitution: RosacAcknowledgment = {
  name: 'Vicerrectoría de Investigación, UCR',
  href: 'https://vinv.ucr.ac.cr',
  logo: {
    src: '/images/ROSAC/acknowledgments/vicerrectoria-investigacion.webp',
    alt: 'Logo de la Vicerrectoría de Investigación',
  },
}

const unlinkedInstitution: RosacAcknowledgment = {
  name: 'Prysmian Group',
  logo: { src: '/images/ROSAC/acknowledgments/prysmian-group.webp', alt: 'Logo de Prysmian Group' },
}

describe('AcknowledgmentsGallery', () => {
  test('renders one tile per institution', () => {
    render(<AcknowledgmentsGallery {...defaultArgs} />)

    const grid = screen.getByRole('list', { name: defaultArgs.label })
    expect(within(grid).getAllByRole('listitem')).toHaveLength(defaultArgs.institutions.length)
  })

  test('shows every institution logo', () => {
    render(<AcknowledgmentsGallery {...defaultArgs} />)

    for (const institution of defaultArgs.institutions) {
      expect(screen.getByRole('img', { name: institution.logo.alt })).toHaveAttribute(
        'src',
        institution.logo.src,
      )
    }
  })

  test('links an institution with a confirmed URL to its own site in a new tab', () => {
    render(<AcknowledgmentsGallery label="Agradecimientos" institutions={[linkedInstitution]} />)

    const link = screen.getByRole('link', { name: linkedInstitution.logo.alt })
    expect(link).toHaveAttribute('href', linkedInstitution.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('renders an institution without a confirmed URL as a non-interactive tile', () => {
    render(<AcknowledgmentsGallery label="Agradecimientos" institutions={[unlinkedInstitution]} />)

    expect(
      screen.queryByRole('link', { name: unlinkedInstitution.logo.alt }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: unlinkedInstitution.logo.alt })).toBeInTheDocument()
  })

  test('renders a single institution as a one-tile grid', () => {
    render(<AcknowledgmentsGallery {...singleArgs} />)

    const grid = screen.getByRole('list', { name: singleArgs.label })
    expect(within(grid).getAllByRole('listitem')).toHaveLength(1)
  })
})
