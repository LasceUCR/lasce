import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AcademicActivityCard, type AcademicActivityCardProps } from './AcademicActivityCard'
import { Default } from './AcademicActivityCard.stories'

const defaultArgs = Default.args as AcademicActivityCardProps

/**
 * jsdom has no layout and no ResizeObserver, so the clamp never overflows on its own. This stands
 * in for both: the observer reports once on `observe`, and every element measures as `overflows`.
 */
function mockDescriptionOverflow(overflows: boolean) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: () => void
      constructor(callback: () => void) {
        this.callback = callback
      }
      observe() {
        this.callback()
      }
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(overflows ? 200 : 80)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(80)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AcademicActivityCard', () => {
  test('renders the activity title, category badge, and metadata', () => {
    renderWithIntl(<AcademicActivityCard {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: defaultArgs.activity.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Actividad académica')).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.activity.category)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(defaultArgs.activity.date))).toBeInTheDocument()
  })

  test('renders the full description in the card, with no link elsewhere to a detail page', () => {
    const { container } = renderWithIntl(<AcademicActivityCard {...defaultArgs} />)

    const description = container.querySelector('.academic-activity-card-description')
    // Multi-paragraph text, so compare node by node rather than normalizing whitespace away.
    expect(description).toHaveTextContent(defaultArgs.activity.description.replaceAll('\n\n', ' '))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('offers "Leer más" inline when the description overflows, and expands it in place', () => {
    mockDescriptionOverflow(true)
    const { container } = renderWithIntl(<AcademicActivityCard {...defaultArgs} />)

    const description = container.querySelector('.academic-activity-card-description')
    const toggle = screen.getByRole('button', { name: 'Leer más' })
    expect(description).toContainElement(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Leer menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  test('leaves the description as plain text with no toggle when it fits', () => {
    mockDescriptionOverflow(false)
    renderWithIntl(<AcademicActivityCard {...defaultArgs} />)

    expect(screen.queryByRole('button', { name: /Leer más|Leer menos/ })).not.toBeInTheDocument()
  })
})
