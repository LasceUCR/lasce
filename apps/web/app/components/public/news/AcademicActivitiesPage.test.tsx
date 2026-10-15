import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AcademicActivitiesPage, type AcademicActivitiesPageProps } from './AcademicActivitiesPage'
import { Default, Empty } from './AcademicActivitiesPage.stories'

const defaultArgs = Default.args as AcademicActivitiesPageProps
const emptyArgs = Empty.args as AcademicActivitiesPageProps

describe('AcademicActivitiesPage', () => {
  test('shows the hero title, lead and a card for every activity', () => {
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Actividades académicas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Talleres, cursos, charlas y actividades científicas y formativas organizadas o vinculadas al LASCE.',
      ),
    ).toBeInTheDocument()

    for (const activity of defaultArgs.activities) {
      expect(screen.getByRole('heading', { level: 3, name: activity.title })).toBeInTheDocument()
    }
  })

  test('links each card to its own detail page', () => {
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    for (const activity of defaultArgs.activities) {
      expect(
        screen.getAllByRole('link', { name: /Ver detalles de la actividad/i })[0],
      ).toHaveAttribute('href', `/actividades-academicas/${activity.slug}`)
    }
  })

  test('shows an empty message instead of the list when there are no activities', () => {
    renderWithIntl(<AcademicActivitiesPage {...emptyArgs} />)

    expect(
      screen.getByText('No hay actividades académicas disponibles en este momento.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  test('links back to the home page', () => {
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute('href', '/')
  })

  test('shows the hero in English when the page is rendered in English', () => {
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />, { locale: 'en' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Academic activities' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to home/i })).toHaveAttribute('href', '/')
  })
})
