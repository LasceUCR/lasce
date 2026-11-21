import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { mockTextLayout } from '@/app/lib/testing/mockTextLayout'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { TruncatedText, type TruncatedTextProps } from './TruncatedText'
import { Long, OneLineCustomLabels, Short } from './TruncatedText.stories'

const longArgs = Long.args as TruncatedTextProps
const shortArgs = Short.args as TruncatedTextProps
const customArgs = OneLineCustomLabels.args as TruncatedTextProps

/** `mockTextLayout` models a text box whose lines hold this many characters. */
const CHARS_PER_LINE = 40

/** The element `TruncatedText` renders (`as`), around the text. */
function blockOf(element: HTMLElement) {
  return element.closest('.truncated-text') as HTMLElement
}

beforeEach(() => {
  mockTextLayout(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TruncatedText', () => {
  test('cuts long text to the lines it is given and puts "… Leer más" right after the last word', () => {
    renderWithIntl(<TruncatedText {...longArgs} />)

    const toggle = screen.getByRole('button', { name: 'Leer más' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', blockOf(toggle).id)

    // The visible text ends where the toggle starts: no gap pushes it to the right edge.
    const visible = toggle.previousElementSibling as HTMLElement
    expect(visible).toHaveAttribute('aria-hidden', 'true')
    expect(visible.textContent?.endsWith('… ')).toBe(true)
    const shown = visible.textContent!.slice(0, -2)
    expect(longArgs.children.startsWith(shown)).toBe(true)
    expect(shown.length).toBeLessThan(longArgs.children.length)
    // It fits in the lines it was given, toggle included.
    expect(`${visible.textContent}Leer más`.length).toBeLessThanOrEqual(
      longArgs.lines * CHARS_PER_LINE,
    )
    // Cut between words.
    expect(longArgs.children.charAt(shown.length)).toMatch(/\s/)
  })

  test('shows the whole text in place, and clamps it again', async () => {
    const user = userEvent.setup()
    renderWithIntl(<TruncatedText {...longArgs} />)

    await user.click(screen.getByRole('button', { name: 'Leer más' }))

    const toggle = screen.getByRole('button', { name: 'Leer menos' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    // Right after the last word, with no ellipsis left.
    expect(blockOf(toggle).textContent).toBe(`${longArgs.children} Leer menos`)

    await user.click(screen.getByRole('button', { name: 'Leer menos' }))
    expect(screen.getByRole('button', { name: 'Leer más' })).toBeInTheDocument()
  })

  test('keeps the same toggle, and its keyboard focus, when it expands and collapses', async () => {
    const user = userEvent.setup()
    renderWithIntl(<TruncatedText {...longArgs} />)

    await user.tab()
    const toggle = screen.getByRole('button', { name: 'Leer más' })
    expect(toggle).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Leer menos' })).toBe(toggle)
    expect(toggle).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Leer más' })).toBe(toggle)
    expect(toggle).toHaveFocus()
  })

  test('leaves text that fits as it is, with no toggle', () => {
    renderWithIntl(<TruncatedText {...shortArgs} />)

    expect(screen.getByText(shortArgs.children)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('keeps the whole text in the page even while clamped', () => {
    renderWithIntl(<TruncatedText {...longArgs} />)

    expect(screen.getByText(longArgs.children)).toBeInTheDocument()
  })

  test('uses the labels it is given', async () => {
    const user = userEvent.setup()
    renderWithIntl(<TruncatedText {...customArgs} />)

    await user.click(screen.getByRole('button', { name: 'Ver descripción completa' }))
    expect(screen.getByRole('button', { name: 'Ocultar descripción' })).toBeInTheDocument()
  })

  test("labels the toggle in the site's language and marks only the text's language", () => {
    renderWithIntl(<TruncatedText {...longArgs} lang="es" />, { locale: 'en' })

    const toggle = screen.getByRole('button', { name: 'Read more' })
    expect(blockOf(toggle)).toHaveAttribute('lang', 'es')
    // The toggle keeps the site's language even though it sits inside the text's element.
    expect(toggle).toHaveAttribute('lang', 'en')
  })

  test('renders as the element it is asked for, with its classes', () => {
    renderWithIntl(<TruncatedText {...shortArgs} as="div" className="research-note" />)

    const block = blockOf(screen.getByText(shortArgs.children))
    expect(block.tagName).toBe('DIV')
    expect(block).toHaveClass('research-note')
  })
})
