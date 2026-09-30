import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import {
  AcademicActivitiesSection,
  type AcademicActivitiesSectionProps,
} from './AcademicActivitiesSection'
import { Default, Empty } from './AcademicActivitiesSection.stories'

const defaultArgs = Default.args as AcademicActivitiesSectionProps
const emptyArgs = Empty.args as AcademicActivitiesSectionProps

describe('AcademicActivitiesSection', () => {
  test('renders the section title and description', () => {
    render(<AcademicActivitiesSection {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Actividades académicas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Talleres, cursos, charlas y actividades científicas y formativas/i),
    ).toBeInTheDocument()
  })

  test('renders academic activity cards', () => {
    render(<AcademicActivitiesSection {...defaultArgs} />)

    for (const activity of defaultArgs.activities) {
      expect(screen.getByRole('heading', { level: 3, name: activity.title })).toBeInTheDocument()
    }
  })

  test('renders empty message when no activities are available', () => {
    render(<AcademicActivitiesSection {...emptyArgs} />)

    expect(
      screen.getByText('No hay actividades académicas disponibles en este momento.'),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
