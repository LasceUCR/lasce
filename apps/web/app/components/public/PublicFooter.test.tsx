import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { PublicFooter, type PublicFooterProps } from './PublicFooter'
import { Default } from './PublicFooter.stories'

// The story is the fixture: reusing its args keeps the documented state and the
// asserted one from drifting.
const defaultArgs = Default.args as PublicFooterProps

describe('PublicFooter', () => {
  test('is the page contentinfo landmark', () => {
    render(<PublicFooter {...defaultArgs} />)

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  test('shows the copyright notice for the year it was given', () => {
    render(<PublicFooter {...defaultArgs} />)

    const footer = within(screen.getByRole('contentinfo'))
    const { holder, notice } = defaultArgs.content.copyright

    expect(footer.getByText(`© ${defaultArgs.year} ${holder}. ${notice}`)).toBeInTheDocument()
  })

  test('names the university, CINESPA and LASCE beside the logo', () => {
    render(<PublicFooter {...defaultArgs} />)

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
    render(<PublicFooter {...defaultArgs} />)

    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText(defaultArgs.content.location)).toBeInTheDocument()
  })

  test('keeps the legal information outside the footer navigation', () => {
    render(<PublicFooter {...defaultArgs} />)

    const { links, navigationLabel } = defaultArgs.content
    const navigation = within(screen.getByRole('navigation', { name: navigationLabel }))

    expect(navigation.queryByText(/©/)).not.toBeInTheDocument()
    expect(navigation.queryByRole('list')).not.toBeInTheDocument()
    expect(navigation.getAllByRole('link')).toHaveLength(links.length)
  })

  test('links to the contact page and opens Instagram in a new tab', () => {
    render(<PublicFooter {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto')

    const instagram = screen.getByRole('link', { name: 'Instagram' })
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/lasce_ucr/')
    expect(instagram).toHaveAttribute('target', '_blank')
    expect(instagram.getAttribute('rel')).toContain('noreferrer')
  })

  test('defaults to the current year when none is given', () => {
    render(<PublicFooter content={defaultArgs.content} />)

    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText(new RegExp(`© ${new Date().getFullYear()} `))).toBeInTheDocument()
  })
})
