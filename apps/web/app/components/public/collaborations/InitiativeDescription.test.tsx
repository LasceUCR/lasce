import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { mockTextLayout } from '@/app/lib/testing/mockTextLayout'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { InitiativeDescription, type InitiativeDescriptionProps } from './InitiativeDescription'
import {
  LongDescription,
  MultipleParagraphs,
  ShortDescription,
} from './InitiativeDescription.stories'

const longArgs = LongDescription.args as InitiativeDescriptionProps
const multipleArgs = MultipleParagraphs.args as InitiativeDescriptionProps
const shortArgs = ShortDescription.args as InitiativeDescriptionProps

beforeEach(() => {
  mockTextLayout(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('InitiativeDescription', () => {
  test('shows a preview with the collapsed toggle inside the description', () => {
    renderWithIntl(<InitiativeDescription {...longArgs} />)

    const control = screen.getByRole('button', { name: 'Leer más', expanded: false })
    expect(document.getElementById(control.getAttribute('aria-controls')!)).toContainElement(
      control,
    )
    expect(control.previousElementSibling).toHaveAttribute('aria-hidden', 'true')
    expect(control.previousElementSibling?.textContent?.endsWith('… ')).toBe(true)
  })

  test('expands every paragraph and collapses with the same focused inline control', async () => {
    const user = userEvent.setup()
    renderWithIntl(<InitiativeDescription {...multipleArgs} />)

    await user.tab()
    const control = screen.getByRole('button', { name: 'Leer más' })
    expect(control).toHaveFocus()
    await user.keyboard('{Enter}')
    const description = document.getElementById(control.getAttribute('aria-controls')!)!
    expect(description.textContent).toBe(`${multipleArgs.paragraphs.join('\n\n')} Leer menos`)
    expect(screen.getByRole('button', { name: 'Leer menos', expanded: true })).toBe(control)
    expect(control).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Leer más', expanded: false })).toHaveFocus()
  })

  test('keeps a short description fully visible with no toggle', () => {
    mockTextLayout(false)
    renderWithIntl(<InitiativeDescription {...shortArgs} />)

    expect(screen.getByText(shortArgs.paragraphs[0]!)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('expands each description independently', async () => {
    const user = userEvent.setup()
    renderWithIntl(
      <>
        <InitiativeDescription {...longArgs} />
        <InitiativeDescription {...multipleArgs} />
      </>,
    )
    const controls = screen.getAllByRole('button', { name: 'Leer más' })
    expect(controls[0]!.getAttribute('aria-controls')).not.toBe(
      controls[1]!.getAttribute('aria-controls'),
    )

    await user.click(controls[0]!)
    expect(controls[0]).toHaveAttribute('aria-expanded', 'true')
    expect(controls[1]).toHaveAttribute('aria-expanded', 'false')
  })

  test('uses the selected language for the expansion control', async () => {
    const user = userEvent.setup()
    renderWithIntl(<InitiativeDescription {...longArgs} />, { locale: 'en' })
    await user.click(screen.getByRole('button', { name: 'Read more' }))
    expect(screen.getByRole('button', { name: 'Read less', expanded: true })).toBeInTheDocument()
  })
})
