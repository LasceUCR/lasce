import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResearcherCard, type ResearcherCardProps } from './ResearcherCard'
import { Default, WithoutDescription, WithoutEmail } from './ResearcherCard.stories'

const defaultArgs = Default.args as ResearcherCardProps
const withoutEmailArgs = WithoutEmail.args as ResearcherCardProps
const withoutDescriptionArgs = WithoutDescription.args as ResearcherCardProps

describe('ResearcherCard', () => {
  test('shows the role, name, institution and description', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.name })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.role)).toBeInTheDocument()
    expect(screen.getByText(`Institución: ${defaultArgs.institution}`)).toBeInTheDocument()
    expect(defaultArgs.description).toBeDefined()
    expect(screen.getByText(defaultArgs.description ?? '')).toBeInTheDocument()
  })

  test('lets the keyboard reach a named description so overflow can be read', () => {
    render(<ResearcherCard {...defaultArgs} />)

    const descriptionScroll = screen.getByLabelText(`Descripción de ${defaultArgs.name}`)
    expect(descriptionScroll).toHaveAttribute('tabindex', '0')
    expect(defaultArgs.description).toBeDefined()
    expect(descriptionScroll).toHaveTextContent(defaultArgs.description ?? '')
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

  test('omits the description when none was supplied', () => {
    render(<ResearcherCard {...withoutDescriptionArgs} />)

    expect(screen.getByRole('heading', { name: withoutDescriptionArgs.name })).toBeInTheDocument()
    expect(
      screen.getByText(`Institución: ${withoutDescriptionArgs.institution}`),
    ).toBeInTheDocument()
    expect(withoutEmailArgs.description).toBeDefined()
    expect(screen.queryByText(withoutEmailArgs.description ?? '')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(`Descripción de ${withoutDescriptionArgs.name}`),
    ).not.toBeInTheDocument()
  })

  test('keeps the portrait decorative so the name is not announced twice', () => {
    const { container } = render(<ResearcherCard {...defaultArgs} />)

    const image = container.querySelector('img')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('src', defaultArgs.src)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
