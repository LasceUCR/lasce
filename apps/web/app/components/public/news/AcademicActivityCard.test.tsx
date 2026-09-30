import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AcademicActivityCard, type AcademicActivityCardProps } from './AcademicActivityCard'
import { Default } from './AcademicActivityCard.stories'

const defaultArgs = Default.args as AcademicActivityCardProps

describe('AcademicActivityCard', () => {
  test('renders the activity title, category badge, and metadata', () => {
    render(<AcademicActivityCard {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: defaultArgs.activity.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Actividad académica')).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.activity.category)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(defaultArgs.activity.date))).toBeInTheDocument()
  })

  test('renders the abstract text', () => {
    render(<AcademicActivityCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.activity.abstract)).toBeInTheDocument()
  })

  test('links to the activity detail page', () => {
    render(<AcademicActivityCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /Ver detalles de la actividad/i })
    expect(link).toHaveAttribute('href', `/noticias/actividades/${defaultArgs.activity.slug}`)
  })
})
