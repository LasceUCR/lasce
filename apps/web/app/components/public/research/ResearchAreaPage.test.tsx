import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResearchAreaPage, type ResearchAreaPageProps } from './ResearchAreaPage'
import { Default, MinimalDetails } from './ResearchAreaPage.stories'

const defaultArgs = Default.args as ResearchAreaPageProps
const minimalArgs = MinimalDetails.args as ResearchAreaPageProps

describe('ResearchAreaPage', () => {
  test('renders the research area title and lead text', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: defaultArgs.area.title })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.area.lead!)).toBeInTheDocument()
  })

  test('renders each objective when the area provides them', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Objetivos' })).toBeInTheDocument()
    for (const objective of defaultArgs.area.objectives!) {
      expect(screen.getByText(objective)).toBeInTheDocument()
    }
  })

  test('renders the scope paragraph when provided', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Alcance' })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.area.scope!)).toBeInTheDocument()
  })

  test('renders each research topic when the area provides them', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Temas de investigación' })).toBeInTheDocument()
    for (const topic of defaultArgs.area.topics!) {
      expect(screen.getByText(topic)).toBeInTheDocument()
    }
  })

  test('renders back links to the research areas list', () => {
    render(<ResearchAreaPage {...defaultArgs} />)

    const backLinks = screen.getAllByRole('link', { name: defaultArgs.backLabel! })
    expect(backLinks.length).toBeGreaterThanOrEqual(1)
    for (const link of backLinks) {
      expect(link).toHaveAttribute('href', defaultArgs.backHref)
    }
  })

  test('renders without crashing when optional sections are absent', () => {
    render(<ResearchAreaPage {...minimalArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: minimalArgs.area.title })).toBeInTheDocument()
    expect(screen.getByText(minimalArgs.area.description)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Objetivos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Alcance' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Temas de investigación' })).not.toBeInTheDocument()
  })
})
