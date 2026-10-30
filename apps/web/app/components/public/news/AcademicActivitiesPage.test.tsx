import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { listingHref } from '@/app/lib/pagination'

import {
  AcademicActivitiesPage,
  SEARCH_DELAY_MS,
  type AcademicActivitiesPageProps,
} from './AcademicActivitiesPage'
import { Default, Empty } from './AcademicActivitiesPage.stories'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  query: '',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/actividades-academicas',
  useSearchParams: () => new URLSearchParams(mocks.query),
}))

const defaultArgs = Default.args as AcademicActivitiesPageProps
const emptyArgs = Empty.args as AcademicActivitiesPageProps

afterEach(() => {
  mocks.query = ''
  mocks.replace.mockReset()
})

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

  test('renders the full description for every activity, with no detail-page link', () => {
    const { container } = renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    for (const activity of defaultArgs.activities) {
      const description = container.querySelector('.academic-activity-card-description')
      // Multi-paragraph text, so compare node by node rather than normalizing whitespace away.
      expect(description).toHaveTextContent(activity.description.replaceAll('\n\n', ' '))
    }
    expect(screen.queryByRole('link', { name: /Ver detalles/i })).not.toBeInTheDocument()
  })

  test('shows an empty message instead of the list when there are no activities', () => {
    renderWithIntl(<AcademicActivitiesPage {...emptyArgs} />)

    expect(
      screen.getByText('No hay actividades académicas disponibles en este momento.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  test('filters activities using the query from the URL', () => {
    mocks.replace.mockClear()
    mocks.query = 'q=machine+learning'
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Se encontró 1 actividad académica. Mostrando la actividad 1 de 1.'),
    ).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  test('updates the URL after typing pauses', async () => {
    const user = userEvent.setup()
    mocks.replace.mockClear()
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar actividades académicas' }),
      'machine learning',
    )

    expect(mocks.replace).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY_MS + 100))
    expect(mocks.replace).toHaveBeenCalledWith(
      listingHref('/actividades-academicas', { query: 'machine learning' }),
      { scroll: false },
    )
  })

  test('shows the visible range and total for multiple activities', () => {
    const [activity] = defaultArgs.activities
    renderWithIntl(
      <AcademicActivitiesPage
        activities={[activity!, { ...activity!, slug: `${activity!.slug}-2` }]}
      />,
    )

    expect(screen.getByText('Mostrando 1–2 de 2.')).toBeInTheDocument()
  })

  test('submits the search query in the URL', async () => {
    const user = userEvent.setup()
    mocks.replace.mockClear()
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar actividades académicas' }),
      ' machine learning ',
    )
    fireEvent.submit(screen.getByRole('search'))

    expect(mocks.replace).toHaveBeenCalledWith(
      listingHref('/actividades-academicas', { query: 'machine learning' }),
      { scroll: false },
    )
  })

  test('initializes the search from the URL query', () => {
    mocks.query = 'q=machine+learning'
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    expect(screen.getByRole('searchbox', { name: 'Buscar actividades académicas' })).toHaveValue(
      'machine learning',
    )
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    )
  })

  test('syncs the search box when the URL query changes', () => {
    mocks.query = 'q=machine+learning'
    const { rerender } = renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    mocks.query = 'q=space+weather'
    rerender(<AcademicActivitiesPage {...defaultArgs} />)

    expect(screen.getByRole('searchbox', { name: 'Buscar actividades académicas' })).toHaveValue(
      'space weather',
    )
  })

  test('shows a search-specific empty message when the URL query has no matches', () => {
    mocks.query = 'q=no+existe'
    renderWithIntl(<AcademicActivitiesPage {...defaultArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'No se encontraron actividades académicas para “no existe”.',
    )
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
    expect(
      screen.getByRole('searchbox', { name: 'Search academic activities' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to home/i })).toHaveAttribute('href', '/')
  })
})
