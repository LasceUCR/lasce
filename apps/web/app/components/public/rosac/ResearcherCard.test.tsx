import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import {
  ResearcherCard,
  institutionPreview,
  type ResearcherCardProps,
} from './ResearcherCard'
import { Default, WithoutDescription, WithoutEmail } from './ResearcherCard.stories'

const defaultArgs = Default.args as ResearcherCardProps
const withoutEmailArgs = WithoutEmail.args as ResearcherCardProps
const withoutDescriptionArgs = WithoutDescription.args as ResearcherCardProps

function isOnHiddenFace(text: string) {
  const element = screen.getByText(text)
  return element.closest('[aria-hidden="true"]') !== null
}

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
    expect(
      screen.getAllByText(`Institución: ${institutionPreview(defaultArgs.institution)}`).length,
    ).toBeGreaterThan(0)
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

  test('places several emails on one line with a comma between them', () => {
    render(
      <ResearcherCard
        {...defaultArgs}
        email={['jcamachoga@ice.go.cr', 'Johanna.camacho@ucr.ac.cr']}
      />,
    )

    const ice = screen.getByRole('link', { name: 'jcamachoga@ice.go.cr' })
    expect(ice.parentElement).toHaveTextContent('jcamachoga@ice.go.cr, Johanna.camacho@ucr.ac.cr')
    expect(ice).toHaveAttribute('href', 'mailto:jcamachoga@ice.go.cr')
    expect(screen.getByRole('link', { name: 'Johanna.camacho@ucr.ac.cr' })).toHaveAttribute(
      'href',
      'mailto:Johanna.camacho@ucr.ac.cr',
    )
  })

  test('keeps the email link outside the flip control', () => {
    render(<ResearcherCard {...defaultArgs} />)

    expect(typeof defaultArgs.email).toBe('string')
    const email = defaultArgs.email
    if (typeof email !== 'string') {
      throw new Error('the default card has one email')
    }
    const flip = screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` })
    expect(within(flip).queryByRole('link')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: email })
    expect(link).toHaveAttribute('href', `mailto:${email}`)
  })

  test('does not flip when the email is opened', async () => {
    const user = userEvent.setup()
    render(<ResearcherCard {...defaultArgs} />)

    expect(typeof defaultArgs.email).toBe('string')
    const email = defaultArgs.email
    if (typeof email !== 'string') {
      throw new Error('the default card has one email')
    }
    await user.click(screen.getByRole('link', { name: email }))

    expect(
      screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  test('omits the email when none was supplied', () => {
    render(<ResearcherCard {...withoutEmailArgs} />)

    expect(screen.getByRole('heading', { name: withoutEmailArgs.name })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(
      screen.getAllByText(`Institución: ${institutionPreview(withoutEmailArgs.institution)}`)
        .length,
    ).toBeGreaterThan(0)
  })

  test('omits the flip when no description was supplied', () => {
    render(<ResearcherCard {...withoutDescriptionArgs} />)

    expect(screen.getByRole('heading', { name: withoutDescriptionArgs.name })).toBeInTheDocument()
    expect(
      screen.getAllByText(`Institución: ${institutionPreview(withoutDescriptionArgs.institution)}`)
        .length,
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

  test('flips to the full institution when it does not fit and there is no description', async () => {
    const user = userEvent.setup()
    const institution = 'Escuela de Ciencias de la Computación e Informática, UCR'
    const name = 'Dr. Luis Gustavo Esquivel Quirós'
    render(<ResearcherCard {...withoutDescriptionArgs} institution={institution} name={name} />)

    const preview = `Institución: ${institutionPreview(institution)}`
    const full = `Institución: ${institution}`
    expect(isOnHiddenFace(preview)).toBe(false)
    expect(isOnHiddenFace(full)).toBe(true)
    expect(screen.queryByRole('region', { name: `Descripción de ${name}` })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `Ver institución de ${name}` }))

    expect(isOnHiddenFace(full)).toBe(false)
    expect(isOnHiddenFace(preview)).toBe(true)
    expect(
      screen.getByRole('button', { name: `Volver a la ficha de ${name}` }),
    ).toHaveFocus()
  })

  test('shows a long institution in full only after the card flips', async () => {
    const user = userEvent.setup()
    const institution = [
      'Escuela de Ingeniería Mecatrónica, TEC;',
      'Laboratorio de Inteligencia Artificial para las Ciencias Naturales (LIANA), TEC',
    ].join(' ')
    render(<ResearcherCard {...defaultArgs} institution={institution} />)

    const preview = `Institución: ${institution.slice(0, 50)}...`
    const full = `Institución: ${institution}`
    expect(isOnHiddenFace(preview)).toBe(false)
    expect(isOnHiddenFace(full)).toBe(true)

    await user.click(screen.getByRole('button', { name: `Ver descripción de ${defaultArgs.name}` }))

    expect(isOnHiddenFace(full)).toBe(false)
    expect(isOnHiddenFace(preview)).toBe(true)
  })

  test('keeps the portrait decorative so the name is not announced twice', () => {
    const { container } = render(<ResearcherCard {...defaultArgs} />)

    const image = container.querySelector('img')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('src', defaultArgs.src)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
