import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { NewsCard, type NewsCardProps } from './NewsCard'
import {
  Default,
  English,
  LongText,
  TranslationMissing,
  Undated,
  WithoutLink,
  WithoutSummary,
} from './NewsCard.stories'

const defaultArgs = Default.args as NewsCardProps & { date: string }
const englishArgs = English.args as NewsCardProps & { date: string }

describe('NewsCard', () => {
  test('leads with the title as a heading', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: defaultArgs.title })).toBeInTheDocument()
  })

  test('shows authors, source and date on one line, with a machine-readable date', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    const meta = screen.getByText(defaultArgs.source, { exact: false })
    expect(meta).toHaveTextContent(
      `${defaultArgs.authors} · ${defaultArgs.source} · ${defaultArgs.date}`,
    )
    expect(screen.getByText(defaultArgs.date)).toHaveAttribute('datetime', '2026-05-24')
  })

  test('shows "Sin fecha" as plain text for an undated item', () => {
    renderWithIntl(<NewsCard {...(Undated.args as NewsCardProps)} />)

    expect(screen.getByText(/Sin fecha/)).toBeInTheDocument()
    expect(document.querySelector('time')).toBeNull()
  })

  test('says an undated item is undated in English', () => {
    renderWithIntl(<NewsCard {...(Undated.args as NewsCardProps)} />, { locale: 'en' })

    expect(screen.getByText(/Undated/)).toBeInTheDocument()
  })

  test('leaves the authors out of the line when there are none', () => {
    renderWithIntl(<NewsCard {...defaultArgs} authors="" />)

    expect(screen.getByText(defaultArgs.source, { exact: false })).toHaveTextContent(
      `${defaultArgs.source} · ${defaultArgs.date}`,
    )
  })

  test('shows the summary when there is one', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.abstract)).toBeInTheDocument()
  })

  test('omits the summary paragraph when there is none', () => {
    const args = WithoutSummary.args as NewsCardProps
    const { container } = renderWithIntl(<NewsCard {...args} />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  test('shows no image', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('opens the external article, which is the item’s detail view, in a new tab', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /^Abrir fuente/ })
    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('names the link after its article and says it opens a new tab', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(
      screen.getByRole('link', {
        name: `Abrir fuente de «${defaultArgs.title}» (se abre en una pestaña nueva)`,
      }),
    ).toBeInTheDocument()
  })

  test('renders no link when the item has none', () => {
    renderWithIntl(<NewsCard {...(WithoutLink.args as NewsCardProps)} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('renders long text in full for the layout to wrap', () => {
    const args = LongText.args as NewsCardProps
    renderWithIntl(<NewsCard {...args} />)

    expect(screen.getByRole('heading', { name: args.title })).toBeInTheDocument()
    expect(screen.getByText(args.abstract)).toBeInTheDocument()
  })
})

describe('NewsCard: languages', () => {
  test('shows the English title, abstract, date and link label to an English reader', () => {
    renderWithIntl(<NewsCard {...englishArgs} />, { locale: 'en' })

    expect(screen.getByRole('heading', { name: englishArgs.title })).toBeInTheDocument()
    expect(screen.getByText(englishArgs.abstract)).toBeInTheDocument()
    expect(screen.getByText(englishArgs.date)).toHaveAttribute('datetime', '2026-05-24')
    expect(
      screen.getByRole('link', {
        name: `Open source of “${englishArgs.title}” (opens in a new tab)`,
      }),
    ).toBeInTheDocument()
  })

  test('marks the title and abstract with the language they are written in', () => {
    renderWithIntl(<NewsCard {...englishArgs} />, { locale: 'en' })

    expect(screen.getByRole('heading', { name: englishArgs.title })).toHaveAttribute('lang', 'en')
    expect(screen.getByText(englishArgs.abstract)).toHaveAttribute('lang', 'en')
  })

  test('marks text of unknown language with an empty lang and tells editors it lacks English', () => {
    const args = TranslationMissing.args as NewsCardProps
    renderWithIntl(<NewsCard {...args} />)

    expect(screen.getByRole('heading', { name: args.title })).toHaveAttribute('lang', '')
    expect(screen.getByText(/Sin versión en inglés/)).toBeInTheDocument()
  })

  test('says nothing about translations to a visitor', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.queryByText(/Sin versión en inglés/)).not.toBeInTheDocument()
  })
})
