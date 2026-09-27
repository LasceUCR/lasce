import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AcademicActivityPage, type AcademicActivityPageProps } from './AcademicActivityPage'
import { Default } from './AcademicActivityPage.stories'

const defaultArgs = Default.args as AcademicActivityPageProps

describe('AcademicActivityPage', () => {
  test('renders hero with activity title and abstract', () => {
    render(<AcademicActivityPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 1, name: defaultArgs.activity.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.activity.abstract)).toBeInTheDocument()
  })

  test('renders detailed description and metadata', () => {
    render(<AcademicActivityPage {...defaultArgs} />)

    const paragraphs = defaultArgs.activity.description.split('\n\n')
    for (const paragraph of paragraphs) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
    if (defaultArgs.activity.category) {
      expect(screen.getByText(new RegExp(defaultArgs.activity.category))).toBeInTheDocument()
    }
    if (defaultArgs.activity.date) {
      expect(screen.getByText(new RegExp(defaultArgs.activity.date))).toBeInTheDocument()
    }
    if (defaultArgs.activity.location) {
      expect(screen.getByText(new RegExp(defaultArgs.activity.location))).toBeInTheDocument()
    }
  })

  test('renders external resources links', () => {
    render(<AcademicActivityPage {...defaultArgs} />)

    if (defaultArgs.activity.resources) {
      for (const resource of defaultArgs.activity.resources) {
        const link = screen.getByRole('link', { name: new RegExp(resource.label) })
        expect(link).toHaveAttribute('href', resource.href)
      }
    }
  })

  test('renders back link to news page', () => {
    render(<AcademicActivityPage {...defaultArgs} />)

    const backLink = screen.getByRole('link', { name: /Volver a noticias/i })
    expect(backLink).toHaveAttribute('href', '/noticias')
  })
})
