import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { PublicationCard, type PublicationCardProps } from './PublicationCard'
import { Default, InstitutionalReport } from './PublicationCard.stories'

const defaultArgs = Default.args as PublicationCardProps
const institutionalArgs = InstitutionalReport.args as PublicationCardProps

/**
 * jsdom has no layout and no ResizeObserver, so the clamp never overflows on its own. This stands
 * in for both: the observer reports once on `observe`, and every element measures as `overflows`.
 */
function mockAbstractOverflow(overflows: boolean) {
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

describe('PublicationCard', () => {
  test('shows the title, authors, venue, year and research group it was given', () => {
    const { container } = renderWithIntl(<PublicationCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.title })).toBeInTheDocument()

    const metadata = container.querySelector('.publication-meta')

    expect(metadata).toHaveTextContent(defaultArgs.authors)
    expect(metadata).toHaveTextContent(defaultArgs.venue)
    expect(metadata).toHaveTextContent(defaultArgs.year)
    expect(metadata).toHaveTextContent(defaultArgs.researchGroup)
  })

  test('shows the abstract with the clamp class applied', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} />)

    const abstract = screen.getByText(defaultArgs.abstract)
    expect(abstract).toHaveClass('publication-abstract')
  })

  test('links out through the DOI / external link action', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /DOI \/ Enlace externo/ })
    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('places the external link in a footer aligned to the right of the card', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /DOI \/ Enlace externo/ })
    expect(link.parentElement).toHaveClass('publication-card-footer')
  })

  test('omits the footer when there is no link and the abstract fits', () => {
    mockAbstractOverflow(false)
    const { container } = renderWithIntl(<PublicationCard {...defaultArgs} href={undefined} />)

    expect(container.querySelector('.publication-card-footer')).toBeNull()
  })

  test('offers a "Leer resumen completo" button when a publication without a link overflows', () => {
    mockAbstractOverflow(true)
    renderWithIntl(<PublicationCard {...defaultArgs} href={undefined} />)

    const abstract = screen.getByText(defaultArgs.abstract)
    const toggle = screen.getByRole('button', { name: 'Leer resumen completo' })
    expect(toggle).toHaveClass('button', 'button-primary')
    expect(toggle.parentElement).toHaveClass('publication-card-footer')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', abstract.id)
    expect(abstract).not.toHaveClass('is-expanded')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Ocultar resumen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(abstract).toHaveClass('is-expanded')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar resumen' }))

    expect(screen.getByRole('button', { name: 'Leer resumen completo' })).toBeInTheDocument()
    expect(abstract).not.toHaveClass('is-expanded')
  })

  test('never offers the abstract toggle on a publication with an external link', () => {
    mockAbstractOverflow(true)
    renderWithIntl(<PublicationCard {...defaultArgs} />)

    expect(
      screen.queryByRole('button', { name: /Leer resumen completo|Ocultar resumen/ }),
    ).toBeNull()
    expect(screen.getByRole('link', { name: /DOI \/ Enlace externo/ })).toBeInTheDocument()
  })

  test('renders a non-scientific publication venue without truncating it', () => {
    renderWithIntl(<PublicationCard {...institutionalArgs} />)

    expect(screen.getByText(institutionalArgs.venue, { exact: false })).toBeInTheDocument()
  })

  test('marks the title and abstract with the language they are written in', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} contentLang="en" />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('lang', 'en')
    expect(screen.getByText(defaultArgs.abstract)).toHaveAttribute('lang', 'en')
  })

  test('declares the language unknown for a legacy record instead of claiming Spanish', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} contentLang="" />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('lang', '')
  })

  test('inherits the page language when no content language is given', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 3 })).not.toHaveAttribute('lang')
  })

  test('tells editors that the English version is missing', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} translationMissing />)

    expect(screen.getByRole('note')).toHaveTextContent('Sin versión en inglés.')
  })

  test('says nothing about translations by default', () => {
    renderWithIntl(<PublicationCard {...defaultArgs} />)

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  test('shows its buttons and note in the language the site is shown in', () => {
    renderWithIntl(
      <PublicationCard {...defaultArgs} href="https://example.org/a" translationMissing />,
      { locale: 'en' },
    )

    expect(screen.getByRole('link', { name: 'DOI / External link' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'No English version. Editing the title or the abstract requires completing both languages.',
      ),
    ).toBeInTheDocument()
  })
})
