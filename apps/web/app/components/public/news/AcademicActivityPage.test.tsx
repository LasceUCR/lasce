import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getAcademicActivities } from '@/app/lib/academic-activities'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AcademicActivityPage, type AcademicActivityPageProps } from './AcademicActivityPage'
import { Default } from './AcademicActivityPage.stories'

const defaultArgs = Default.args as AcademicActivityPageProps

describe('AcademicActivityPage', () => {
  test('renders hero with activity title and abstract', () => {
    renderWithIntl(<AcademicActivityPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 1, name: defaultArgs.activity.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.activity.abstract)).toBeInTheDocument()
  })

  test('renders detailed description and metadata', () => {
    renderWithIntl(<AcademicActivityPage {...defaultArgs} />)

    const paragraphs = defaultArgs.activity.description.split('\n\n')
    for (const paragraph of paragraphs) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
    if (defaultArgs.activity.category) {
      expect(screen.getByText('Tipo de actividad')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(defaultArgs.activity.category)).length).toBeGreaterThan(
        0,
      )
    }
    if (defaultArgs.activity.date) {
      expect(screen.getByText('Fecha')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(defaultArgs.activity.date)).length).toBeGreaterThan(0)
    }
    if (defaultArgs.activity.location) {
      expect(screen.getByText('Lugar')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(defaultArgs.activity.location)).length).toBeGreaterThan(
        0,
      )
    }
  })

  test('renders external resources links', () => {
    renderWithIntl(<AcademicActivityPage {...defaultArgs} />)

    if (defaultArgs.activity.resources) {
      for (const resource of defaultArgs.activity.resources) {
        const link = screen.getByRole('link', { name: new RegExp(resource.label) })
        expect(link).toHaveAttribute('href', resource.href)
      }
    }
  })

  test('renders back link to news page', () => {
    renderWithIntl(<AcademicActivityPage {...defaultArgs} />)

    const backLink = screen.getByRole('link', { name: /Volver a noticias/i })
    expect(backLink).toHaveAttribute('href', '/noticias')
  })

  test('shows the activity in English when the page is rendered in English', () => {
    const [activity] = getAcademicActivities(getMessages('en').academicActivities.items)
    renderWithIntl(<AcademicActivityPage activity={activity!} />, { locale: 'en' })

    // The official title of the event is the same in every language.
    expect(
      screen.getByRole('heading', { level: 1, name: defaultArgs.activity.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Type of activity')).toBeInTheDocument()
    expect(screen.getByText('Workshop')).toBeInTheDocument()
    expect(screen.getByText('16-20 February 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View the workshop photo gallery/ })).toHaveAttribute(
      'href',
      '/galeria/workshop-ml-2026',
    )
    expect(screen.getByRole('link', { name: 'Back to news' })).toHaveAttribute('href', '/noticias')
  })
})
