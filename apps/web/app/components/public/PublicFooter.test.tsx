import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { PublicFooter, type PublicFooterProps } from './PublicFooter'
import { Default } from './PublicFooter.stories'
import { renderWithIntl } from '@/app/lib/i18n/testing'

// The story is the fixture: reusing its args keeps the documented state and the
// asserted one from drifting.
const defaultArgs = Default.args as PublicFooterProps

function renderFooter(props: PublicFooterProps = defaultArgs, locale?: 'es' | 'en') {
  return renderWithIntl(<PublicFooter {...props} />, { locale })
}

describe('PublicFooter', () => {
  test('is the page contentinfo landmark', () => {
    renderFooter()

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  test('shows the copyright notice for the year it was given', () => {
    renderFooter()

    const footer = within(screen.getByRole('contentinfo'))
    const { holder, notice } = defaultArgs.content.copyright

    expect(footer.getByText(`© ${defaultArgs.year} ${holder}. ${notice}`)).toBeInTheDocument()
  })

  test('names the university, CINESPA and LASCE beside the logo', () => {
    renderFooter()

    const { institutions, institutionsLabel } = defaultArgs.content
    const list = within(screen.getByRole('list', { name: institutionsLabel }))

    expect(list.getAllByRole('listitem')).toHaveLength(institutions.length)

    for (const institution of institutions) {
      const label = list.getByText(institution.label)

      if (institution.name) {
        expect(label).toHaveAttribute('title', institution.name)
      }

      if (institution.href) {
        const link = list.getByRole('link', { name: institution.label })
        expect(link).toHaveAttribute('href', institution.href)
        expect(link).toHaveAttribute('target', '_blank')
        expect(link.getAttribute('rel')).toContain('noreferrer')
      } else {
        expect(list.queryByRole('link', { name: institution.label })).not.toBeInTheDocument()
      }
    }
  })

  test('shows the campus location', () => {
    renderFooter()

    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText(defaultArgs.content.location)).toBeInTheDocument()
  })

  test('links the ISWI logo to its official site', () => {
    renderFooter()

    const { navigationLabel, partnerLogo } = defaultArgs.content
    const link = screen.getByRole('link', { name: partnerLogo.name })

    expect(link).toHaveAttribute('href', partnerLogo.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(within(link).getByRole('img', { name: partnerLogo.name })).toHaveAttribute(
      'src',
      partnerLogo.src,
    )

    // The logo identifies a partner organisation, so it stays out of the footer navigation.
    const navigation = within(screen.getByRole('navigation', { name: navigationLabel }))
    expect(navigation.queryByRole('img')).not.toBeInTheDocument()
  })

  test('keeps the legal information outside the footer navigation', () => {
    renderFooter()

    const { links, navigationLabel } = defaultArgs.content
    const navigation = within(screen.getByRole('navigation', { name: navigationLabel }))

    expect(navigation.queryByText(/©/)).not.toBeInTheDocument()
    expect(navigation.queryByRole('list')).not.toBeInTheDocument()
    expect(navigation.getAllByRole('link')).toHaveLength(links.length)
  })

  test('links to the contact page and opens Instagram in a new tab', () => {
    renderFooter()

    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto')

    const instagram = screen.getByRole('link', { name: 'Instagram' })
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/lasce_ucr/')
    expect(instagram).toHaveAttribute('target', '_blank')
    expect(instagram.getAttribute('rel')).toContain('noreferrer')
  })

  test('defaults to the current year when none is given', () => {
    renderFooter({ content: defaultArgs.content })

    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText(new RegExp(`© ${new Date().getFullYear()} `))).toBeInTheDocument()
  })

  test('keeps the official UCR name in the English light logo alternative text', () => {
    renderFooter(defaultArgs, 'en')

    expect(screen.getByAltText('Universidad de Costa Rica')).toBeInTheDocument()
  })
})
