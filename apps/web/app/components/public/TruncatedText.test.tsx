import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { TruncatedText, type TruncatedTextProps } from './TruncatedText'
import { Long, OneLineCustomLabels, Short } from './TruncatedText.stories'

const longArgs = Long.args as TruncatedTextProps
const shortArgs = Short.args as TruncatedTextProps
const customArgs = OneLineCustomLabels.args as TruncatedTextProps

/**
 * jsdom lays nothing out, so the text's size is set here: `overflowing` decides whether its full
 * height is taller than the clamped box, and the observer reports it straight away.
 */
let overflowing = false

/** The number of lines the text is clamped to, or `''` while it is shown whole. */
function clampOf(element: HTMLElement) {
  return element.style.getPropertyValue('-webkit-line-clamp')
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: () => void) {}
      observe() {
        this.callback()
      }
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() =>
    overflowing ? 120 : 60,
  )
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => 60)
})

afterEach(() => {
  overflowing = false
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TruncatedText', () => {
  test('clamps long text to the lines it is given and offers "Leer más"', () => {
    overflowing = true
    renderWithIntl(<TruncatedText {...longArgs} />)

    const text = screen.getByText(longArgs.children)
    expect(clampOf(text)).toBe('3')
    const toggle = screen.getByRole('button', { name: 'Leer más' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', text.id)
  })

  test('shows the whole text in place, and clamps it again', async () => {
    overflowing = true
    const user = userEvent.setup()
    renderWithIntl(<TruncatedText {...longArgs} />)

    await user.click(screen.getByRole('button', { name: 'Leer más' }))

    const text = screen.getByText(longArgs.children)
    expect(clampOf(text)).toBe('')
    expect(screen.getByRole('button', { name: 'Leer menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Leer menos' }))
    expect(screen.getByRole('button', { name: 'Leer más' })).toBeInTheDocument()
  })

  test('leaves text that fits as it is, with no toggle', () => {
    renderWithIntl(<TruncatedText {...shortArgs} />)

    expect(screen.getByText(shortArgs.children)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('keeps the whole text in the page even while clamped', () => {
    overflowing = true
    renderWithIntl(<TruncatedText {...longArgs} />)

    expect(screen.getByText(longArgs.children)).toHaveTextContent(longArgs.children)
  })

  test('uses the labels it is given', async () => {
    overflowing = true
    const user = userEvent.setup()
    renderWithIntl(<TruncatedText {...customArgs} />)

    expect(clampOf(screen.getByText(customArgs.children))).toBe('1')
    await user.click(screen.getByRole('button', { name: 'Ver descripción completa' }))
    expect(screen.getByRole('button', { name: 'Ocultar descripción' })).toBeInTheDocument()
  })

  test("labels the toggle in the site's language and marks only the text's language", () => {
    overflowing = true
    renderWithIntl(<TruncatedText {...longArgs} lang="es" />, { locale: 'en' })

    expect(screen.getByText(longArgs.children)).toHaveAttribute('lang', 'es')
    expect(screen.getByRole('button', { name: 'Read more' })).not.toHaveAttribute('lang')
  })

  test('renders as the element it is asked for, with its classes', () => {
    renderWithIntl(<TruncatedText {...shortArgs} as="div" className="research-note" />)

    const text = screen.getByText(shortArgs.children)
    expect(text.tagName).toBe('DIV')
    expect(text).toHaveClass('research-note')
  })
})
