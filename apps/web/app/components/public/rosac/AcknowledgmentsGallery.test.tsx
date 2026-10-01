import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

// `AcknowledgmentsGallery.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { AcknowledgmentsGallery, type AcknowledgmentsGalleryProps } from './AcknowledgmentsGallery'
import { Default, SingleInstitution } from './AcknowledgmentsGallery.stories'

const defaultArgs = Default.args as AcknowledgmentsGalleryProps
const singleArgs = SingleInstitution.args as AcknowledgmentsGalleryProps

describe('AcknowledgmentsGallery', () => {
  test('renders one slide per institution', () => {
    render(<AcknowledgmentsGallery {...defaultArgs} />)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    expect(within(track).getAllByRole('listitem')).toHaveLength(defaultArgs.institutions.length)
  })

  test('shows every institution name and logo', () => {
    render(<AcknowledgmentsGallery {...defaultArgs} />)

    for (const institution of defaultArgs.institutions) {
      expect(screen.getByText(institution.name)).toBeInTheDocument()
      expect(screen.getByRole('img', { name: institution.logo.alt })).toHaveAttribute(
        'src',
        institution.logo.src,
      )
    }
  })

  test('renders a single institution as a one-card track', () => {
    render(<AcknowledgmentsGallery {...singleArgs} />)

    const track = screen.getByRole('list', { name: singleArgs.label })
    expect(within(track).getAllByRole('listitem')).toHaveLength(1)
  })

  test('offers previous and next controls to scroll the track', () => {
    render(<AcknowledgmentsGallery {...defaultArgs} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
  })
})
