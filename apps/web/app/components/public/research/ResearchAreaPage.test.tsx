import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ResearchAreaPage, type ResearchAreaPageProps } from './ResearchAreaPage'
import { Default, MinimalDetails } from './ResearchAreaPage.stories'

const defaultArgs = Default.args as ResearchAreaPageProps
const minimalArgs = MinimalDetails.args as ResearchAreaPageProps

describe('ResearchAreaPage', () => {
  test('renders the research area title and description', () => {
    renderWithIntl(<ResearchAreaPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: defaultArgs.area.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText(defaultArgs.area.description)).toBeInTheDocument()
  })

  test('renders a back link to the research areas list', () => {
    renderWithIntl(<ResearchAreaPage {...defaultArgs} />)

    const backLink = screen.getByRole('link', {
      name: defaultArgs.backLabel!,
    })

    expect(backLink).toHaveAttribute('href', defaultArgs.backHref)
  })

  test('renders correctly with the minimal research area data', () => {
    renderWithIntl(<ResearchAreaPage {...minimalArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: minimalArgs.area.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText(minimalArgs.area.description)).toBeInTheDocument()
  })

  test('marks the language of the title and the description', () => {
    renderWithIntl(
      <ResearchAreaPage {...defaultArgs} area={{ ...defaultArgs.area, contentLocale: 'en' }} />,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'en')
    expect(screen.getByText(defaultArgs.area.description)).toHaveAttribute('lang', 'en')
  })

  test("shows its kicker and default back link in the site's language", () => {
    renderWithIntl(<ResearchAreaPage area={minimalArgs.area} />, { locale: 'en' })

    expect(screen.getByText('Research area')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to research areas' })).toHaveAttribute(
      'href',
      '/investigacion',
    )
  })
})
