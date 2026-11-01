import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  InitiativeDescription,
  INITIATIVE_PREVIEW_LIMIT,
  type InitiativeDescriptionProps,
} from './InitiativeDescription'
import {
  LongDescription,
  MultipleParagraphs,
  ShortDescription,
} from './InitiativeDescription.stories'

const longArgs = LongDescription.args as InitiativeDescriptionProps
const multipleArgs = MultipleParagraphs.args as InitiativeDescriptionProps
const shortArgs = ShortDescription.args as InitiativeDescriptionProps

describe('InitiativeDescription', () => {
  test('shows a limited preview and exposes the collapsed state', () => {
    renderWithIntl(<InitiativeDescription {...longArgs} />)

    expect(
      screen.getByText(
        `${longArgs.paragraphs.join(' ').slice(0, INITIATIVE_PREVIEW_LIMIT).trimEnd()}…`,
        { exact: false },
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(longArgs.paragraphs[0]!)).not.toBeInTheDocument()
    const control = screen.getByRole('button', { name: 'Leer más', expanded: false })
    expect(document.getElementById(control.getAttribute('aria-controls')!)).toContainElement(
      control,
    )
  })

  test('expands every paragraph and collapses with the same focused inline control', async () => {
    const user = userEvent.setup()
    renderWithIntl(<InitiativeDescription {...multipleArgs} />)

    await user.tab()
    const control = screen.getByRole('button', { name: 'Leer más' })
    expect(control).toHaveFocus()
    await user.keyboard('{Enter}')
    for (const paragraph of multipleArgs.paragraphs) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Leer menos', expanded: true })).toBe(control)
    expect(control).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Leer más', expanded: false })).toHaveFocus()
    expect(screen.queryByText(multipleArgs.paragraphs.at(-1)!)).not.toBeInTheDocument()
  })

  test('keeps short descriptions and descriptions exactly at the limit fully visible', () => {
    const atLimit = 'a'.repeat(INITIATIVE_PREVIEW_LIMIT)
    renderWithIntl(
      <>
        <InitiativeDescription {...shortArgs} />
        <InitiativeDescription paragraphs={[atLimit]} />
      </>,
    )

    expect(screen.getByText(shortArgs.paragraphs[0]!)).toBeInTheDocument()
    expect(screen.getByText(atLimit)).toBeInTheDocument()
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
    await user.click(controls[1]!)
    await user.click(controls[0]!)
    expect(controls[1]).toHaveAttribute('aria-expanded', 'true')
  })

  test('uses the selected language for the expansion control', async () => {
    const user = userEvent.setup()
    renderWithIntl(<InitiativeDescription {...longArgs} />, { locale: 'en' })
    await user.click(screen.getByRole('button', { name: 'Read more' }))
    expect(screen.getByRole('button', { name: 'Read less', expanded: true })).toBeInTheDocument()
  })
})
