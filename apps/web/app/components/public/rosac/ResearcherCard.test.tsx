import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { ResearcherCard, type ResearcherCardProps } from './ResearcherCard'
import { Default, WithoutDescription, WithoutEmail } from './ResearcherCard.stories'

const defaultArgs = Default.args as ResearcherCardProps
const withoutEmailArgs = WithoutEmail.args as ResearcherCardProps
const withoutDescriptionArgs = WithoutDescription.args as ResearcherCardProps

describe('ResearcherCard', () => {
  test('does not focus a flip control on mount', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(
      screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }),
    ).not.toHaveFocus()
  })

  test('shows the role, name, email and institution on the front', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.name })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.role)).toBeInTheDocument()
    expect(screen.getAllByText(`Institución: ${defaultArgs.institution}`).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('region', { name: `Descripción de ${defaultArgs.name}` }),
    ).not.toBeInTheDocument()
  })

  test('flips to the description when the card is activated', async () => {
    const user = userEvent.setup()
    render(<ResearcherCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }))

    expect(screen.getByRole('heading', { name: defaultArgs.name })).toBeInTheDocument()
    expect(defaultArgs.description).toBeDefined()
    expect(
      screen.getByRole('region', { name: `Descripción de ${defaultArgs.name}` }),
    ).toHaveTextContent(defaultArgs.description ?? '')
    expect(
      screen.getByRole('button', { name: `Volver a la ficha de ${defaultArgs.name}` }),
    ).toHaveFocus()
  })

  test('flips back to the photo when the back of the card is activated', async () => {
    const user = userEvent.setup()
    render(<ResearcherCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }))
    await user.click(
      screen.getByRole('button', { name: `Volver a la ficha de ${defaultArgs.name}` }),
    )

    expect(
      screen.queryByRole('region', { name: `Descripción de ${defaultArgs.name}` }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: defaultArgs.name })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.role)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }),
    ).toHaveFocus()
  })

  test('flips from the keyboard', async () => {
    const user = userEvent.setup()
    render(<ResearcherCard {...defaultArgs} />)

    const flip = screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` })
    flip.focus()
    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('region', { name: `Descripción de ${defaultArgs.name}` }),
    ).toHaveTextContent(defaultArgs.description ?? '')
    expect(
      screen.getByRole('button', { name: `Volver a la ficha de ${defaultArgs.name}` }),
    ).toHaveFocus()
  })

  test('lets the keyboard reach a named description so overflow can be read', async () => {
    const user = userEvent.setup()
    render(<ResearcherCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }))

    const descriptionScroll = screen.getByRole('region', {
      name: `Descripción de ${defaultArgs.name}`,
    })
    expect(descriptionScroll).toHaveAttribute('tabindex', '0')
    expect(defaultArgs.description).toBeDefined()
    expect(descriptionScroll).toHaveTextContent(defaultArgs.description ?? '')
  })

  test('keeps the email link outside the flip control', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(defaultArgs.email).toBeDefined()
    const flip = screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` })
    expect(within(flip).queryByRole('link')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: defaultArgs.email })
    expect(link).toHaveAttribute('href', `mailto:${defaultArgs.email}`)
  })

  test('does not flip when the email is opened', async () => {
    const user = userEvent.setup()
    render(<ResearcherCard {...defaultArgs} />)

    expect(defaultArgs.email).toBeDefined()
    await user.click(screen.getByRole('link', { name: defaultArgs.email }))

    expect(
      screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  test('omits the email when none was supplied', () => {
    render(<ResearcherCard {...withoutEmailArgs} />)

    expect(screen.getByRole('heading', { name: withoutEmailArgs.name })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(
      screen.getAllByText(`Institución: ${withoutEmailArgs.institution}`).length,
    ).toBeGreaterThan(0)
  })

  test('omits the flip when no description was supplied', () => {
    render(<ResearcherCard {...withoutDescriptionArgs} />)

    expect(screen.getByRole('heading', { name: withoutDescriptionArgs.name })).toBeInTheDocument()
    expect(
      screen.getAllByText(`Institución: ${withoutDescriptionArgs.institution}`).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: `Ver descripción de ${withoutDescriptionArgs.name}` }),
    ).not.toBeInTheDocument()
    expect(withoutEmailArgs.description).toBeDefined()
    expect(screen.queryByText(withoutEmailArgs.description ?? '')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: `Descripción de ${withoutDescriptionArgs.name}` }),
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
