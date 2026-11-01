import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { CollaborationCard, type CollaborationCardProps } from './CollaborationCard'
import {
  International,
  LegacyCountry,
  National,
  TranslatedCountry,
  WithoutAcronym,
  WithoutLogo,
  WithoutWebsite,
  WithoutMedia,
} from './CollaborationCard.stories'

const nationalArgs = National.args as CollaborationCardProps
const internationalArgs = International.args as CollaborationCardProps
const withoutAcronymArgs = WithoutAcronym.args as CollaborationCardProps

describe('CollaborationCard', () => {
  test('links the institutional logo without a separate website label and supports keyboard focus', async () => {
    const user = userEvent.setup()
    renderWithIntl(<CollaborationCard {...nationalArgs} />)

    expect(screen.getByRole('img', { name: `Logotipo de ${nationalArgs.name}` })).toHaveAttribute(
      'src',
      nationalArgs.logoPath,
    )
    const link = screen.getByRole('link', {
      name: `Sitio web oficial de ${nationalArgs.name} (abre en una pestaña nueva)`,
    })
    expect(link).toHaveAttribute('href', nationalArgs.websiteUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(
      within(link).getByRole('img', { name: `Logotipo de ${nationalArgs.name}` }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText('Sitio web oficial')).not.toBeInTheDocument()
    await user.tab()
    expect(link).toHaveFocus()
  })

  test('links the organization name when its website is available without a logo', () => {
    const args = WithoutLogo.args as CollaborationCardProps
    renderWithIntl(<CollaborationCard {...args} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: args.name })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', args.websiteUrl)
    expect(screen.getByRole('link')).toHaveAccessibleDescription(
      `Sitio web oficial de ${args.name} (abre en una pestaña nueva)`,
    )
    expect(
      within(screen.getByRole('heading', { name: args.name })).getByRole('link'),
    ).toHaveTextContent(args.name)
    expect(screen.queryByText('Sitio web oficial')).not.toBeInTheDocument()
    expect(screen.getByText('Nacional')).toBeInTheDocument()
  })

  test('keeps the logo and organization information visible without a website', () => {
    const args = WithoutWebsite.args as CollaborationCardProps
    renderWithIntl(<CollaborationCard {...args} />)
    expect(screen.getByRole('img', { name: `Logotipo de ${args.name}` })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: args.name })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Internacional')).toBeInTheDocument()
  })

  test('preserves all text when neither a logo nor a website is available', () => {
    const args = WithoutMedia.args as CollaborationCardProps
    renderWithIntl(<CollaborationCard {...args} />)
    expect(screen.getByRole('heading', { name: args.name })).toBeInTheDocument()
    expect(screen.getByText(args.country)).toBeInTheDocument()
    expect(screen.getByText(args.acronym!)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test.each([
    '',
    ' ',
    '/partner',
    'not a URL',
    'javascript:alert(1)',
    'data:text/html,hello',
    'https://user:password@example.com',
  ])('omits invalid or unsafe website %s', (websiteUrl) => {
    renderWithIntl(<CollaborationCard {...nationalArgs} websiteUrl={websiteUrl} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: nationalArgs.name })).toBeInTheDocument()
  })

  test('translates the logo and link accessible names into English', () => {
    renderWithIntl(<CollaborationCard {...nationalArgs} />, { locale: 'en' })
    expect(screen.getByRole('img', { name: `Logo of ${nationalArgs.name}` })).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: `Official website of ${nationalArgs.name} (opens in a new tab)`,
      }),
    ).toHaveAttribute('href', nationalArgs.websiteUrl)
    expect(screen.queryByText('Official website')).not.toBeInTheDocument()
  })

  test('renders national collaboration name, country and scope badge', () => {
    renderWithIntl(<CollaborationCard {...nationalArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: nationalArgs.name })).toBeInTheDocument()
    expect(screen.getByText('Nacional')).toBeInTheDocument()
    expect(screen.getByText(nationalArgs.country)).toBeInTheDocument()
    expect(screen.getByText(nationalArgs.acronym as string)).toBeInTheDocument()
  })

  test('renders international collaboration details', () => {
    renderWithIntl(<CollaborationCard {...internationalArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: internationalArgs.name }),
    ).toBeInTheDocument()
    expect(screen.getByText('Internacional')).toBeInTheDocument()
    expect(screen.getByText(internationalArgs.country)).toBeInTheDocument()
    expect(screen.getByText(internationalArgs.acronym as string)).toBeInTheDocument()
  })

  test('renders without acronym when not provided', () => {
    renderWithIntl(<CollaborationCard {...withoutAcronymArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: withoutAcronymArgs.name }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Siglas:/)).not.toBeInTheDocument()
  })

  test('renders translated country text and English labels while preserving official names', () => {
    renderWithIntl(<CollaborationCard {...(TranslatedCountry.args as CollaborationCardProps)} />, {
      locale: 'en',
    })

    expect(screen.getByRole('heading', { name: withoutAcronymArgs.name })).toBeInTheDocument()
    expect(screen.getByText('International')).toBeInTheDocument()
    expect(screen.getByText('France')).toHaveAttribute('lang', 'en')
  })

  test('keeps a legacy country readable without claiming it is in the interface language', () => {
    renderWithIntl(<CollaborationCard {...(LegacyCountry.args as CollaborationCardProps)} />, {
      locale: 'en',
    })

    expect(screen.getByText('International')).toBeInTheDocument()
    expect(screen.getByText('Francia')).toHaveAttribute('lang', '')
  })
})
