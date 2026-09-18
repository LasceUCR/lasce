import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResearchAreaPage, type ResearchAreaPageProps } from './ResearchAreaPage'
import { Default, MinimalDetails } from './ResearchAreaPage.stories'

const defaultArgs = Default.args as ResearchAreaPageProps
const minimalArgs = MinimalDetails.args as ResearchAreaPageProps

describe('ResearchAreaPage', () => {
  test('renders the research area title and description', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: defaultArgs.area.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText(defaultArgs.area.description)).toBeInTheDocument()
  })

  test('renders a back link to the research areas list', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    const backLink = screen.getByRole('link', {
      name: defaultArgs.backLabel!,
    })

    expect(backLink).toHaveAttribute('href', defaultArgs.backHref)
  })

  test('renders correctly with the minimal research area data', () => {
    render(<ResearchAreaPage {...minimalArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: minimalArgs.area.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText(minimalArgs.area.description)).toBeInTheDocument()
  })
})
