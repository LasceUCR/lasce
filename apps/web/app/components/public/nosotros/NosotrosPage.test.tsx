import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

// `NosotrosPage.stories` pulls in `nosotrosContent` from `@/app/lib/nosotros`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static content doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import { NosotrosPage, type NosotrosPageProps } from './NosotrosPage'
import { Default, ProvisionalCopy } from './NosotrosPage.stories'

const defaultArgs = Default.args as NosotrosPageProps
const provisionalArgs = ProvisionalCopy.args as NosotrosPageProps
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function renderPage(props: NosotrosPageProps = defaultArgs) {
  return render(
    <EditModeProvider>
      <NosotrosPage {...props} />
    </EditModeProvider>,
  )
}

const adminGrants = { canCreate: true, canEdit: true, canDelete: true } as const

function renderPageInEditMode(props: Partial<NosotrosPageProps> = {}) {
  return render(
    <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
      <NosotrosPage {...defaultArgs} {...adminGrants} {...props} />
    </EditModeContext.Provider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('NosotrosPage', () => {
  test('presents the laboratory under a single first-level heading', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeInTheDocument()
  })

  test('explains what LASCE is and what it is for', () => {
    renderPage()

    expect(screen.getByRole('region', { name: '¿Quiénes somos?' })).toHaveTextContent(
      /iniciativa científica vinculada al Centro de Investigaciones Espaciales/,
    )
    expect(screen.getByRole('region', { name: 'Nuestra visión' })).toHaveTextContent(
      /referente regional para la observación del Sol/,
    )
    expect(screen.getByRole('region', { name: 'Aporte distintivo' })).toHaveTextContent(
      /no sea únicamente usuaria de información internacional/,
    )
  })

  test('lists everything the laboratory does', () => {
    renderPage()

    const activities = screen.getByRole('region', { name: /Qué hacemos/ })
    expect(within(activities).getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.content.activities.items.length,
    )
    expect(
      within(activities).getByRole('heading', { name: 'Fenómenos solares eruptivos' }),
    ).toBeInTheDocument()
  })

  test('names the university the laboratory belongs to', () => {
    renderPage()

    expect(screen.getByRole('region', { name: '¿Quiénes somos?' })).toHaveTextContent(
      /Universidad de Costa Rica/,
    )
  })

  test('shows no provisional banner now that the copy is approved', () => {
    renderPage()

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  test('flags the copy when a revision is pending approval', () => {
    renderPage(provisionalArgs)

    // The banner branch stays covered so the next editorial revision can use it.
    expect(
      screen.getByRole('complementary', { name: 'Información provisional' }),
    ).toHaveTextContent(/pendiente de revisión/)
  })

  test('returns to the public landing page', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('accepts revised editorial content through props', () => {
    renderPage({
      content: {
        ...defaultArgs.content,
        overview: { title: 'Acerca del laboratorio', paragraphs: ['Descripción actualizada.'] },
      },
    })

    expect(screen.getByRole('region', { name: 'Acerca del laboratorio' })).toHaveTextContent(
      'Descripción actualizada.',
    )
    expect(screen.getByRole('region', { name: 'Nuestra visión' })).toBeInTheDocument()
  })

  test('does not list the ROSAC-only researchers', () => {
    renderPage()

    expect(screen.queryByText('Dr. Miguel Velázquez')).not.toBeInTheDocument()
    expect(screen.queryByText('Jelmuth Rojas')).not.toBeInTheDocument()
  })

  test('lists the LASCE researchers in a scrollable gallery', async () => {
    const user = userEvent.setup()
    renderPage()

    const researchers = screen.getByRole('region', { name: /Investigadores LASCE/ })
    expect(
      within(researchers).getByRole('heading', { level: 2, name: /2\.\s*Investigadores LASCE/ }),
    ).toBeInTheDocument()
    expect(researchers).toHaveTextContent(defaultArgs.content.researchers.intro)
    const track = within(researchers).getByRole('list', {
      name: defaultArgs.content.researchers.title,
    })

    expect(within(track).getAllByRole('listitem')).toHaveLength(
      defaultArgs.content.researchers.people.length,
    )
    expect(track).toHaveAttribute('tabindex', '0')
    expect(within(researchers).getByRole('button', { name: 'Anterior' })).toBeInTheDocument()
    expect(within(researchers).getByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'Dra. Carolina Salas Matamoros' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'Dr. Allan Francisco Berrocal Rojas' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'Dr. Luis Gustavo Esquivel Quirós' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'MSc. Ivania Calvo' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'Dr. Felipe Meza' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'MSc. Alonso Vega' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'Dra. Gabriela Molina' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('heading', { name: 'Dra. Yenca Migoya' }),
    ).toBeInTheDocument()
    expect(
      within(researchers).getByRole('link', { name: 'felipe.mezaobando@ucr.ac.cr' }),
    ).toHaveAttribute('href', 'mailto:felipe.mezaobando@ucr.ac.cr')
    expect(
      within(researchers).getByRole('link', { name: 'alonso.vega_f@ucr.ac.cr' }),
    ).toHaveAttribute('href', 'mailto:alonso.vega_f@ucr.ac.cr')
    expect(
      within(researchers).getByRole('link', { name: 'gmolina@herrera.unt.edu.ar' }),
    ).toHaveAttribute('href', 'mailto:gmolina@herrera.unt.edu.ar')
    expect(within(researchers).getByRole('link', { name: 'yenca@ictp.it' })).toHaveAttribute(
      'href',
      'mailto:yenca@ictp.it',
    )
    expect(
      within(researchers).getByRole('link', { name: 'carolina.salas_mata@ucr.ac.cr' }),
    ).toHaveAttribute('href', 'mailto:carolina.salas_mata@ucr.ac.cr')
    expect(
      within(researchers).getByRole('link', { name: 'allan.berrocal@ucr.ac.cr' }),
    ).toHaveAttribute('href', 'mailto:allan.berrocal@ucr.ac.cr')
    expect(
      within(researchers).getByRole('link', { name: 'ivannia.calvo@ucr.ac.cr' }),
    ).toHaveAttribute('href', 'mailto:ivannia.calvo@ucr.ac.cr')
    expect(within(researchers).getByText('Investigadora principal')).toBeInTheDocument()
    expect(
      within(researchers).getAllByText('Institución: Centro de Investigaciones Espaciales, CINESPA')
        .length,
    ).toBeGreaterThan(0)
    await user.click(
      within(researchers).getByRole('button', {
        name: 'Ver descripción de Dra. Carolina Salas Matamoros',
      }),
    )
    expect(
      within(researchers).getByText(
        /coordina la integración entre astrofísica solar, radioastronomía, clima espacial/,
      ),
    ).toBeInTheDocument()
    expect(within(researchers).getAllByText('Investigador colaborador').length).toBeGreaterThan(0)
    expect(within(researchers).getAllByText('Investigadora colaboradora').length).toBeGreaterThan(
      0,
    )
    await user.click(
      within(researchers).getByRole('button', { name: 'Ver descripción de MSc. Ivania Calvo' }),
    )
    expect(
      within(researchers).getByText(
        'Soporte Técnico/Computacional y encargada del Observatorio Astronómico de San José (OAS)',
      ),
    ).toBeInTheDocument()
  })

  test('explains when no LASCE researchers are available', () => {
    renderPage({
      content: {
        ...defaultArgs.content,
        researchers: { ...defaultArgs.content.researchers, people: [] },
      },
    })

    const researchers = screen.getByRole('region', { name: /Investigadores LASCE/ })
    expect(within(researchers).getByRole('status')).toHaveTextContent(
      defaultArgs.content.researchers.emptyMessage,
    )
    expect(within(researchers).queryByRole('list')).not.toBeInTheDocument()
  })

  test('hides the edit affordances when edit mode is off', () => {
    renderPage()

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  test('offers editing each activity card when edit mode is on', () => {
    renderPageInEditMode()

    const activityCount = defaultArgs.content.activities.items.length
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(activityCount)
    expect(screen.getAllByRole('button', { name: /^Eliminar / })).toHaveLength(activityCount)
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument()
    const [firstActivity] = defaultArgs.content.activities.items
    expect(
      screen.getByRole('button', { name: `Editar ${firstActivity?.title}` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Eliminar ${firstActivity?.title}` }),
    ).toBeInTheDocument()
  })

  test('lets an assistant edit cards without create or delete', () => {
    renderPageInEditMode({ canCreate: false, canDelete: false, canEdit: true })

    const activityCount = defaultArgs.content.activities.items.length
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(activityCount)
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument()
  })

  test('hides every editor when edit mode is on but the account has no grants', () => {
    renderPageInEditMode({ canCreate: false, canDelete: false, canEdit: false })

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument()
  })

  test('opens the edit modal for the activity being edited', async () => {
    const user = userEvent.setup()
    renderPageInEditMode()
    const [firstActivity] = defaultArgs.content.activities.items

    const [firstEditButton] = screen.getAllByRole('button', { name: /^Editar / })
    await user.click(firstEditButton as HTMLElement)

    const dialog = screen.getByRole('dialog', { name: `Editar "${firstActivity?.title}"` })
    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveValue(
      firstActivity?.title,
    )
    expect(within(dialog).getByRole('combobox', { name: 'Ícono' })).toHaveValue(firstActivity?.icon)
  })

  test('asks for confirmation before deleting an activity card', async () => {
    const user = userEvent.setup()
    renderPageInEditMode()

    const [firstDeleteButton] = screen.getAllByRole('button', { name: /^Eliminar / })
    await user.click(firstDeleteButton as HTMLElement)

    expect(screen.getByRole('dialog', { name: 'Eliminar actividad' })).toBeInTheDocument()
  })

  test('PATCHes the activity and refreshes the page once saving succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ activity: {} }) })
    renderPageInEditMode()
    const [firstActivity] = defaultArgs.content.activities.items

    const [firstEditButton] = screen.getAllByRole('button', { name: /^Editar / })
    await user.click(firstEditButton as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/nosotros/activities/${firstActivity?.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('dialog', { name: `Editar "${firstActivity?.title}"` }),
    ).not.toBeInTheDocument()
  })

  test('shows the server error and keeps the modal open when saving fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No tiene permisos para modificar este contenido.' }),
    })
    renderPageInEditMode()
    const [firstActivity] = defaultArgs.content.activities.items

    const [firstEditButton] = screen.getAllByRole('button', { name: /^Editar / })
    await user.click(firstEditButton as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permisos para modificar este contenido.',
    )
    expect(
      screen.getByRole('dialog', { name: `Editar "${firstActivity?.title}"` }),
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('shows a hint to use "Añadir" when there are no activities yet', () => {
    renderPageInEditMode({
      content: {
        ...defaultArgs.content,
        activities: { ...defaultArgs.content.activities, items: [] },
      },
    })

    expect(
      screen.getByText('Haga clic en "Añadir" para agregar alguna actividad.'),
    ).toBeInTheDocument()
  })

  test('does not show the empty-activities hint outside edit mode', () => {
    renderPage({
      content: {
        ...defaultArgs.content,
        activities: { ...defaultArgs.content.activities, items: [] },
      },
    })

    expect(
      screen.queryByText('Haga clic en "Añadir" para agregar alguna actividad.'),
    ).not.toBeInTheDocument()
  })

  test('hides the empty-activities hint from an assistant who cannot create', () => {
    renderPageInEditMode({
      canCreate: false,
      canDelete: false,
      canEdit: true,
      content: {
        ...defaultArgs.content,
        activities: { ...defaultArgs.content.activities, items: [] },
      },
    })

    expect(
      screen.queryByText('Haga clic en "Añadir" para agregar alguna actividad.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument()
  })

  test('creates a new activity through "Añadir" and refreshes on success', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ activity: {} }) })
    renderPageInEditMode()

    await user.click(screen.getByRole('button', { name: 'Añadir' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir' })
    await user.type(within(addDialog).getByRole('textbox', { name: 'Título' }), 'Actividad nueva')
    await user.type(within(addDialog).getByRole('textbox', { name: 'Texto' }), 'Texto de prueba')
    await user.click(within(addDialog).getByRole('button', { name: 'Confirmar' }))

    const confirmDialog = screen.getByRole('dialog', { name: 'Agregar actividad' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/nosotros/activities',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          icon: 'sun',
          title: 'Actividad nueva',
          description: 'Texto de prueba',
        }),
      }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Añadir' })).not.toBeInTheDocument()
  })

  test('shows the server error inside "Añadir" and keeps it open when creating fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No se pudo crear la actividad.' }),
    })
    renderPageInEditMode()

    await user.click(screen.getByRole('button', { name: 'Añadir' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir' })
    await user.type(within(addDialog).getByRole('textbox', { name: 'Título' }), 'Actividad nueva')
    await user.type(within(addDialog).getByRole('textbox', { name: 'Texto' }), 'Texto de prueba')
    await user.click(within(addDialog).getByRole('button', { name: 'Confirmar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Agregar actividad' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear la actividad.')
    expect(screen.getByRole('dialog', { name: 'Añadir' })).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('DELETEs the activity and refreshes the page once deletion succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    renderPageInEditMode()
    const [firstActivity] = defaultArgs.content.activities.items

    const [firstDeleteButton] = screen.getAllByRole('button', { name: /^Eliminar / })
    await user.click(firstDeleteButton as HTMLElement)
    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar actividad' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/nosotros/activities/${firstActivity?.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  test('shows an error message when deletion fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No se pudo eliminar la actividad.' }),
    })
    renderPageInEditMode()

    const [firstDeleteButton] = screen.getAllByRole('button', { name: /^Eliminar / })
    await user.click(firstDeleteButton as HTMLElement)
    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar actividad' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar la actividad.')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
