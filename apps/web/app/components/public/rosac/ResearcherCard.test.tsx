import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

// `ResearcherCard.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { ResearcherCard, type ResearcherCardProps } from './ResearcherCard'
import { Default, WithoutEmail } from './ResearcherCard.stories'

const defaultArgs = Default.args as ResearcherCardProps
const withoutEmailArgs = WithoutEmail.args as ResearcherCardProps

describe('ResearcherCard', () => {
  test('shows the role, name, institution and description', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.name })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.role)).toBeInTheDocument()
    expect(screen.getByText(`Institución: ${defaultArgs.institution}`)).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.description)).toBeInTheDocument()
  })

  test('links the public email when one is available', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(defaultArgs.email).toBeDefined()
    const link = screen.getByRole('link', { name: defaultArgs.email })
    expect(link).toHaveAttribute('href', `mailto:${defaultArgs.email}`)
  })

  test('omits the email when none was supplied', () => {
    render(<ResearcherCard {...withoutEmailArgs} />)

    expect(screen.getByRole('heading', { name: withoutEmailArgs.name })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('keeps the portrait decorative so the name is not announced twice', () => {
    const { container } = render(<ResearcherCard {...defaultArgs} />)

    const image = container.querySelector('img')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('src', defaultArgs.src)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
