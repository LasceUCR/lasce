import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  AcademicActivitiesSection,
  type AcademicActivitiesSectionProps,
} from './AcademicActivitiesSection'
import { Default, Empty, ErrorState, Loading } from './AcademicActivitiesSection.stories'

const defaultArgs = Default.args as AcademicActivitiesSectionProps
const emptyArgs = Empty.args as AcademicActivitiesSectionProps
const loadingArgs = Loading.args as AcademicActivitiesSectionProps
const errorArgs = ErrorState.args as AcademicActivitiesSectionProps

describe('AcademicActivitiesSection', () => {
  test('renders the section title and description', () => {
    renderWithIntl(<AcademicActivitiesSection {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Actividades académicas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Talleres, cursos, charlas y actividades científicas y formativas/i),
    ).toBeInTheDocument()
  })

  test('renders academic activity cards', () => {
    renderWithIntl(<AcademicActivitiesSection {...defaultArgs} />)

    for (const activity of defaultArgs.activities ?? []) {
      expect(screen.getByRole('heading', { level: 3, name: activity.title })).toBeInTheDocument()
    }
  })

  test('renders empty message when no activities are available', () => {
    renderWithIntl(<AcademicActivitiesSection {...emptyArgs} />)

    expect(
      screen.getByText('No hay actividades académicas disponibles en este momento.'),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows skeleton placeholders and marks area busy while loading', () => {
    const { container } = renderWithIntl(<AcademicActivitiesSection {...loadingArgs} />)

    const section = container.querySelector('#academic-activities-section-loading')
    expect(section).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando actividades académicas…')

    const skeletons = container.querySelectorAll('.academic-activity-card')
    expect(skeletons.length).toBeGreaterThan(0)
    for (const skeleton of skeletons) {
      expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    }
  })

  test('hides empty message while loading', () => {
    renderWithIntl(<AcademicActivitiesSection {...loadingArgs} />)

    expect(
      screen.queryByText('No hay actividades académicas disponibles en este momento.'),
    ).not.toBeInTheDocument()
  })

  test('keeps section heading visible while loading', () => {
    renderWithIntl(<AcademicActivitiesSection {...loadingArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Actividades académicas' }),
    ).toBeInTheDocument()
  })

  test('displays error notice and removes busy state when loading fails', () => {
    const { container } = renderWithIntl(<AcademicActivitiesSection {...errorArgs} />)

    const section = container.querySelector('#academic-activities-section-loading')
    expect(section).not.toHaveAttribute('aria-busy')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No fue posible cargar las actividades académicas. Inténtelo de nuevo más tarde.',
    )
    expect(container.querySelectorAll('[aria-hidden="true"].news-card')).toHaveLength(0)
  })

  test('announces loading in English when rendered with English locale', () => {
    renderWithIntl(<AcademicActivitiesSection {...loadingArgs} />, { locale: 'en' })

    expect(screen.getByRole('status')).toHaveTextContent('Loading academic activities…')
  })
})
