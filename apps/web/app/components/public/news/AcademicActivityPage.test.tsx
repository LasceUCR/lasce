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
      expect(screen.getByText('Tipo de actividad:')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(defaultArgs.activity.category)).length).toBeGreaterThan(
        0,
      )
    }
    if (defaultArgs.activity.date) {
      expect(screen.getByText('Fecha:')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(defaultArgs.activity.date)).length).toBeGreaterThan(0)
    }
    if (defaultArgs.activity.location) {
      expect(screen.getByText('Lugar:')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(defaultArgs.activity.location)).length).toBeGreaterThan(
        0,
      )
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
