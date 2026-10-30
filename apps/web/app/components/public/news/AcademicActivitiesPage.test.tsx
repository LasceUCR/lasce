import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  uploadAcademicActivityImage: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
  usePathname: () => '/actividades-academicas',
}))

vi.mock('@/app/(public)/actividades-academicas/actions', () => ({
  uploadAcademicActivityImage: mocks.uploadAcademicActivityImage,
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { AcademicActivity } from '@/app/lib/academic-activities'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { listingHref } from '@/app/lib/pagination'

import { ErrorState, Loading } from './AcademicActivitiesPage.stories'
import {
  AcademicActivitiesPage,
  SEARCH_DELAY_MS,
  type AcademicActivitiesPageProps,
} from './AcademicActivitiesPage'

const activity: AcademicActivity = {
  id: '00000000-0000-4000-8000-000000000001',
  title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
  category: 'Taller',
  date: '16-20 febrero, 2026',
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  description: 'Descripción de prueba.',
  photoUrl: '/images/mock.jpg',
  photoAlt: 'Texto alternativo.',
}

const defaultArgs: AcademicActivitiesPageProps = { activities: [activity] }
const emptyArgs: AcademicActivitiesPageProps = { activities: [] }
const loadingArgs = Loading.args as AcademicActivitiesPageProps
const errorArgs = ErrorState.args as AcademicActivitiesPageProps
const adminGrants = { canCreate: true, canEdit: true, canDelete: true } as const

function renderPage(props: AcademicActivitiesPageProps = defaultArgs, locale?: 'es' | 'en') {
  return renderWithIntl(pageTree(props), locale ? { locale } : undefined)
}

function pageTree(props: AcademicActivitiesPageProps = defaultArgs) {
  return (
    <ToastProvider>
      <EditModeProvider>
        <AcademicActivitiesPage {...props} />
      </EditModeProvider>
    </ToastProvider>
  )
}

function renderPageInEditMode(props: Partial<AcademicActivitiesPageProps> = {}) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <AcademicActivitiesPage {...defaultArgs} {...adminGrants} {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

function failedResponse(status: number, body: unknown) {
  return { ok: false, status, json: async () => body }
}

/** Deletes the first activity, accepting the "Eliminar actividad académica" confirmation. */
async function deleteFirstActivity(user: User) {
  const [firstDeleteButton] = screen.getAllByRole('button', { name: 'Eliminar' })
  await user.click(firstDeleteButton as HTMLElement)
  const dialog = screen.getByRole('dialog', { name: 'Eliminar actividad académica' })
  await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
}

/** Edits the first activity's title and submits it. */
async function submitActivityEdit(user: User) {
  const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
  await user.click(firstEditButton as HTMLElement)
  const dialog = screen.getByRole('dialog', { name: 'Editar actividad académica' })
  const titleInput = within(dialog).getByRole('textbox', { name: 'Título' })
  await user.clear(titleInput)
  await user.type(titleInput, 'Título editado')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
  return dialog
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AcademicActivitiesPage', () => {
  test('shows the hero title, lead and a card for every activity', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Actividades académicas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: activity.title })).toBeInTheDocument()
  })

  test('renders the full description for every activity, with no detail-page link', () => {
    const { container } = renderPage()

    const description = container.querySelector('.academic-activity-card-description')
    expect(description).toHaveTextContent(activity.description.replaceAll('\n\n', ' '))
    expect(screen.queryByRole('link', { name: /Ver detalles/i })).not.toBeInTheDocument()
  })

  test('shows an empty message instead of the list when there are no activities', () => {
    renderPage(emptyArgs)

    expect(
      screen.getByText('No hay actividades académicas disponibles en este momento.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  test('filters activities using the query from the URL', () => {
    renderPage({ ...defaultArgs, query: 'machine learning' })

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Se encontró 1 actividad académica.')).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  test('updates the URL after typing pauses', async () => {
    const user = userEvent.setup()
    mocks.replace.mockClear()
    renderPage()

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

  test('shows the visible range and total when results span multiple pages', () => {
    const item = activity
    renderPage({
      activities: Array.from({ length: 10 }, (_, index) => ({
        ...item,
        id: `${item.id}-${index + 1}`,
      })),
      totalItems: 12,
      totalPages: 2,
    })

    expect(screen.getByText('Mostrando 1-10 de 12.')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Páginas de actividades académicas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute(
      'href',
      '/actividades-academicas?page=2',
    )
  })

  test('preserves the query in page links and starts a new search at page one', async () => {
    const user = userEvent.setup()
    renderPage({
      activities: [activity],
      page: 2,
      query: 'space weather',
      totalItems: 12,
      totalPages: 2,
    })

    expect(screen.getByRole('link', { name: 'Página 1' })).toHaveAttribute(
      'href',
      '/actividades-academicas?q=space+weather',
    )

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar actividades académicas' }),
      ' new',
    )
    fireEvent.submit(screen.getByRole('search'))

    expect(mocks.replace).toHaveBeenCalledWith(
      listingHref('/actividades-academicas', { query: 'space weather new' }),
      { scroll: false },
    )
  })

  test('moves focus to the activity listing when the page changes', () => {
    const { rerender } = renderPage({
      activities: [activity],
      page: 1,
      totalItems: 12,
      totalPages: 2,
    })
    const listing = screen.getByRole('region', { name: 'Actividades académicas' })

    rerender(
      pageTree({
        activities: [activity],
        page: 2,
        totalItems: 12,
        totalPages: 2,
      }),
    )

    expect(listing).toHaveFocus()
  })

  test('submits the search query in the URL', async () => {
    const user = userEvent.setup()
    mocks.replace.mockClear()
    renderPage()

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
    renderPage({ ...defaultArgs, query: 'machine learning' })

    expect(screen.getByRole('searchbox', { name: 'Buscar actividades académicas' })).toHaveValue(
      'machine learning',
    )
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    )
  })

  test('syncs the search box when the URL query changes', () => {
    const { rerender } = renderPage({ ...defaultArgs, query: 'machine learning' })

    rerender(pageTree({ ...defaultArgs, query: 'space weather' }))

    expect(screen.getByRole('searchbox', { name: 'Buscar actividades académicas' })).toHaveValue(
      'space weather',
    )
  })

  test('shows a search-specific empty message when the URL query has no matches', () => {
    renderPage({ activities: [], query: 'no existe' })

    expect(
      screen.getByText('No se encontraron actividades académicas para “no existe”.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  test('links back to the home page', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute('href', '/')
  })

  test('shows the hero in English when the page is rendered in English', () => {
    renderPage(defaultArgs, 'en')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Academic activities' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: 'Search academic activities' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to home/i })).toHaveAttribute('href', '/')
  })

  test('hides the edit affordances when edit mode is off', () => {
    renderPage()

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  test('offers editing and deleting each activity, plus adding one, for an admin account', () => {
    renderPageInEditMode()

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar actividad' })).toBeInTheDocument()
  })

  test('hides every editor when edit mode is on but the account has no grants', () => {
    renderPageInEditMode({ canCreate: false, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar actividad' })).not.toBeInTheDocument()
  })

  test('PATCHes the activity, refreshes the page and confirms it was updated', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ activity: {} }) })
    renderPageInEditMode()

    await submitActivityEdit(user)

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/academic-activities/${activity.id}`,
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('Título editado') }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Actividad actualizada correctamente.')).toBeInTheDocument()
  })

  test('disables the confirm button while the edit request is in flight', async () => {
    const user = userEvent.setup()
    let resolveFetch: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    renderPageInEditMode()

    const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
    await user.click(firstEditButton as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Editar actividad académica' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(within(dialog).getByRole('button', { name: 'Guardando...' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // A second click while the request is still pending must not send another request.
    await user.click(within(dialog).getByRole('button', { name: 'Guardando...' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveFetch({ ok: true, json: async () => ({ activity: {} }) })
    expect(await screen.findByText('Actividad actualizada correctamente.')).toBeInTheDocument()
  })

  test('explains a failed edit inside the open modal and keeps what was typed', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(403, { error: 'No tiene permisos para modificar este contenido.' }),
    )
    renderPageInEditMode()

    const dialog = await submitActivityEdit(user)

    expect(
      await within(dialog).findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveValue('Título editado')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('DELETEs the activity, refreshes the page and confirms it was deleted', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, status: 204 })
    renderPageInEditMode()

    await deleteFirstActivity(user)

    expect(fetchMock).toHaveBeenCalledWith(`/api/academic-activities/${activity.id}`, {
      method: 'DELETE',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Actividad eliminada correctamente.')).toBeInTheDocument()
  })

  test('explains a failed deletion and keeps the activity listed', async () => {
    const user = userEvent.setup()
    const reason =
      'No se pudo eliminar la actividad: la base de datos no respondió. Inténtelo de nuevo en unos minutos.'
    fetchMock.mockResolvedValue(failedResponse(500, { error: reason }))
    renderPageInEditMode()

    await deleteFirstActivity(user)

    expect(await screen.findByText(reason)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: activity.title })).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('shows skeleton placeholders and marks area busy while loading', () => {
    const { container } = renderWithIntl(
      <ToastProvider>
        <EditModeProvider>
          <AcademicActivitiesPage {...loadingArgs} />
        </EditModeProvider>
      </ToastProvider>,
    )

    const region = container.querySelector('#academic-activities-loading-region')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando actividades académicas…')

    const skeletons = container.querySelectorAll('.academic-activity-card')
    expect(skeletons.length).toBeGreaterThan(0)
    for (const skeleton of skeletons) {
      expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    }
  })

  test('hides empty message while loading', () => {
    renderWithIntl(
      <ToastProvider>
        <EditModeProvider>
          <AcademicActivitiesPage {...loadingArgs} />
        </EditModeProvider>
      </ToastProvider>,
    )

    expect(
      screen.queryByText('No hay actividades académicas disponibles en este momento.'),
    ).not.toBeInTheDocument()
  })

  test('keeps hero and footer link functional while loading', () => {
    renderWithIntl(
      <ToastProvider>
        <EditModeProvider>
          <AcademicActivitiesPage {...loadingArgs} />
        </EditModeProvider>
      </ToastProvider>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Actividades académicas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute('href', '/')
  })

  test('displays error notice and removes busy state when loading fails', () => {
    const { container } = renderWithIntl(
      <ToastProvider>
        <EditModeProvider>
          <AcademicActivitiesPage {...errorArgs} />
        </EditModeProvider>
      </ToastProvider>,
    )

    const region = container.querySelector('#academic-activities-loading-region')
    expect(region).not.toHaveAttribute('aria-busy')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No fue posible cargar las actividades académicas. Inténtelo de nuevo más tarde.',
    )
    expect(container.querySelectorAll('[aria-hidden="true"].news-card')).toHaveLength(0)
  })
})
