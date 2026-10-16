import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  uploadAcademicActivityImage: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
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

import { AcademicActivitiesPage, type AcademicActivitiesPageProps } from './AcademicActivitiesPage'

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
const adminGrants = { canCreate: true, canEdit: true, canDelete: true } as const

function renderPage(props: AcademicActivitiesPageProps = defaultArgs, locale?: string) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeProvider>
        <AcademicActivitiesPage {...props} />
      </EditModeProvider>
    </ToastProvider>,
    locale ? { locale } : undefined,
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

  test('links back to the home page', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute('href', '/')
  })

  test('shows the hero in English when the page is rendered in English', () => {
    renderPage(defaultArgs, 'en')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Academic activities' }),
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
})
