import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

// `RosacInfoPage.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  uploadResearcherImage: vi.fn(),
  uploadInstrumentImage: vi.fn(),
  uploadAcknowledgmentLogo: vi.fn(),
}))

// `RosacInfoPage` calls `useRouter()` to refresh after a create/edit/delete,
// which throws outside a mounted app router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadResearcherImage: mocks.uploadResearcherImage,
  uploadInstrumentImage: mocks.uploadInstrumentImage,
  uploadAcknowledgmentLogo: mocks.uploadAcknowledgmentLogo,
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { getMessages } from '@/app/lib/i18n/messages'
import { getRosacInfoContent } from '@/app/lib/rosac'

import { institutionPreview } from './ResearcherCard'
import { RosacInfoPage, type RosacInfoPageProps } from './RosacInfoPage'
import { Default, EditMode } from './RosacInfoPage.stories'

const defaultArgs = Default.args as RosacInfoPageProps
const editModeArgs = EditMode.args as RosacInfoPageProps

afterEach(() => {
  vi.clearAllMocks()
})

function renderPage(props: RosacInfoPageProps = defaultArgs, locale: 'es' | 'en' = 'es') {
  return renderWithIntl(
    <ToastProvider>
      <EditModeProvider>
        <RosacInfoPage {...props} />
      </EditModeProvider>
    </ToastProvider>,
    { locale },
  )
}

function renderEditMode(props: RosacInfoPageProps = editModeArgs) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <RosacInfoPage {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

describe('RosacInfoPage', () => {
  test('places instruments after section five and numbers the following sections consecutively', () => {
    renderPage()

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent?.trim())
    expect(headings.filter((heading) => /^\d\./.test(heading ?? ''))).toEqual([
      '1. Características principales',
      '2. Ubicación',
      '3. ¿Qué desarrollamos en ROSAC?',
      '4. Construcción del ROSAC',
      '5. ¿Por qué observar en radio?',
      '6. Instrumentos científicos',
      '7. Investigadores',
      '8. Donaciones ROSAC',
      '9. Agradecimientos ROSAC',
    ])
    expect(screen.getByRole('region', { name: '4. Construcción del ROSAC' })).toHaveTextContent(
      defaultArgs.content.construction.intro,
    )
  })

  test('shows the location in its own section, with the address always visible and a map', async () => {
    renderPage()

    const location = screen.getByRole('region', { name: '2. Ubicación' })
    expect(location).toHaveTextContent(defaultArgs.content.location.address)

    // The map itself loads on the client only (see RosacLocationMapLoader.tsx), so its
    // region appears a tick after the section that always renders the address.
    expect(
      await within(location).findByRole('region', {
        name: `Mapa de ubicación de ${defaultArgs.content.location.markerLabel}`,
      }),
    ).toBeInTheDocument()
  })

  test('explains the observatory purpose, characteristics and relationship with LASCE', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Radio Observatorio de Santa Cruz (ROSAC)' }),
    ).toBeInTheDocument()
    // The banner and its mobile version share one description; CSS shows only one at a time.
    const [banner, mobileBanner] = screen.getAllByRole('img', {
      name: defaultArgs.content.hero.image.alt,
    })
    expect(banner).toHaveAttribute('src', defaultArgs.content.hero.image.src)
    expect(mobileBanner).toHaveAttribute('src', defaultArgs.content.hero.image.mobileSrc)
    expect(screen.getByRole('region', { name: '¿Qué es ROSAC?' })).toHaveTextContent(
      /observar el Sol y otras fuentes celestes/,
    )
    expect(screen.getByRole('heading', { name: 'Antena de 11 metros' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Santa Cruz, Guanacaste' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entre 100 y 1000 MHz' })).toBeInTheDocument()
    expect(screen.getByText(/Se preparan observaciones en este rango/)).toBeInTheDocument()

    const relationship = screen.getByRole('region', { name: 'ROSAC y LASCE' })
    expect(relationship).toHaveTextContent('LASCE convierte observaciones en conocimiento')
    expect(relationship).toHaveTextContent('ROSAC aporta infraestructura nacional')
  })

  test('does not offer a general scientific consultation section', () => {
    renderPage()

    expect(screen.queryByRole('region', { name: /Consulta científica/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Explorar datos' })).not.toBeInTheDocument()
    const sections = screen.getAllByRole('heading', { level: 2 })
    expect(sections.at(-1)).toHaveTextContent('9. Agradecimientos ROSAC')
  })

  test('presents three instrument cards without authentication or edit permissions', () => {
    renderPage()
    const instruments = within(screen.getByRole('region', { name: '6. Instrumentos científicos' }))
    expect(instruments.getAllByRole('article')).toHaveLength(3)
    expect(instruments.getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(
      instruments.getAllByRole('img', { name: /Imagen ilustrativa de la galería ROSAC/ }),
    ).toHaveLength(3)
    for (const name of ['ROSAC-SABER', 'ROSAC-MIRA 9GHz']) {
      const card = within(instruments.getByRole('article', { name }))
      expect(card.queryByText(/pendiente|por definir/i)).not.toBeInTheDocument()
    }
    expect(
      within(instruments.getByRole('article', { name: 'ROSAC-SABER' })).getByText(
        'Banda entre 100 y 1000 MHz',
      ),
    ).toBeVisible()
    expect(
      within(instruments.getByRole('article', { name: 'ROSAC-MIRA 9GHz' })).getByText(
        'Banda de los 9 GHz',
      ),
    ).toBeVisible()
    expect(
      within(instruments.getByRole('article', { name: 'ROSAC-HIROS' })).getByText(
        'Observación del hidrógeno neutro a 1,4 GHz',
      ),
    ).toBeVisible()
    expect(instruments.getAllByRole('link')).toHaveLength(2)
    expect(instruments.getByText(/integración en la sección de datos/)).toBeVisible()
  })

  test('invites visitors to help and links the donations CTA to the contact page', () => {
    renderPage()

    const donations = screen.getByRole('region', { name: '8. Donaciones ROSAC' })
    expect(
      within(donations).getByRole('heading', { name: defaultArgs.content.donations.cta.title }),
    ).toBeInTheDocument()
    expect(
      within(donations).getByRole('link', { name: defaultArgs.content.donations.cta.buttonLabel }),
    ).toHaveAttribute('href', defaultArgs.content.donations.cta.href)
    // The contact CTA is a primary action: the dark filled button, not the outlined secondary.
    expect(
      within(donations).getByRole('link', { name: defaultArgs.content.donations.cta.buttonLabel }),
    ).toHaveClass('button', 'button-primary')
  })

  test('returns to the home access cards', () => {
    renderPage()

    expect(screen.getByRole('link', { name: defaultArgs.content.backLink.label })).toHaveAttribute(
      'href',
      '/#areas-de-trabajo',
    )
  })

  test('accepts revised editorial content through props', () => {
    renderPage({
      content: {
        ...defaultArgs.content,
        overview: { title: 'Acerca del observatorio', paragraphs: ['Descripción actualizada.'] },
      },
    })

    const overview = screen.getByRole('region', { name: 'Acerca del observatorio' })
    expect(overview).toHaveTextContent('Descripción actualizada.')
    expect(screen.getByRole('region', { name: 'ROSAC y LASCE' })).toBeInTheDocument()
  })

  test('introduces every ROSAC researcher', () => {
    renderPage()

    const team = screen.getByRole('region', { name: /Investigadores/ })
    expect(within(team).getByText(defaultArgs.content.team.hint)).toBeInTheDocument()
    const track = within(team).getByRole('list', { name: defaultArgs.content.team.title })

    expect(within(track).getAllByRole('listitem')).toHaveLength(
      defaultArgs.content.team.people.length,
    )
    expect(within(team).getByText('Investigadora principal')).toBeInTheDocument()
    for (const person of defaultArgs.content.team.people) {
      expect(within(team).getByRole('heading', { name: person.name })).toBeInTheDocument()
      expect(
        within(team).getAllByText(`Institución: ${institutionPreview(person.institution)}`).length,
      ).toBeGreaterThan(0)
    }
  })

  test('explains when no ROSAC researchers are available', () => {
    renderPage({
      content: {
        ...defaultArgs.content,
        team: { ...defaultArgs.content.team, people: [] },
      },
    })

    const team = screen.getByRole('region', { name: /Investigadores/ })
    expect(within(team).getByRole('status')).toHaveTextContent(
      defaultArgs.content.team.emptyMessage,
    )
    expect(within(team).queryByRole('list')).not.toBeInTheDocument()
  })

  test('hides the researcher edit affordances when edit mode is off', () => {
    renderPage()

    expect(screen.queryByRole('button', { name: /^Editar a/ })).not.toBeInTheDocument()
  })

  test('offers editing, deleting and adding researchers for an admin account', () => {
    renderEditMode()

    const team = screen.getByRole('region', { name: /Investigadores/ })
    expect(within(team).getAllByRole('button', { name: /^Editar a/ })).toHaveLength(
      editModeArgs.content.team.people.length,
    )
    expect(within(team).getAllByRole('button', { name: /^Eliminar a/ })).toHaveLength(
      editModeArgs.content.team.people.length,
    )
    expect(within(team).getByRole('button', { name: 'Añadir investigador' })).toBeInTheDocument()
  })

  test('offers only editing for an assistant account without create or delete grants', () => {
    renderEditMode({ ...editModeArgs, canCreate: false, canDelete: false })

    const team = screen.getByRole('region', { name: /Investigadores/ })
    expect(within(team).getAllByRole('button', { name: /^Editar a/ })).toHaveLength(
      editModeArgs.content.team.people.length,
    )
    expect(within(team).queryByRole('button', { name: /^Eliminar a/ })).not.toBeInTheDocument()
    expect(
      within(team).queryByRole('button', { name: 'Añadir investigador' }),
    ).not.toBeInTheDocument()
  })

  test('PATCHes the researcher and refreshes the page once saving succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ researcher: {} }) })
    renderEditMode()
    const [firstPerson] = editModeArgs.content.team.people

    const [firstEditButton] = screen.getAllByRole('button', { name: /^Editar a/ })
    await user.click(firstEditButton as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Editar investigador' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/researchers/${firstPerson?.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Editar investigador' })).not.toBeInTheDocument()
    expect(await screen.findByText('Investigador actualizado correctamente.')).toBeInTheDocument()
  })

  test('explains a failed researcher edit inside the open modal and keeps the form', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'No tiene permisos para modificar este contenido.' }),
    })
    renderEditMode()

    const [firstEditButton] = screen.getAllByRole('button', { name: /^Editar a/ })
    await user.click(firstEditButton as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Editar investigador' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(
      await within(dialog).findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar investigador' })).toBeInTheDocument()
    expect(screen.queryByText('Investigador actualizado correctamente.')).not.toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('DELETEs the researcher and refreshes the page once removal succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true })
    renderEditMode()
    const [firstPerson] = editModeArgs.content.team.people

    const [firstDeleteButton] = screen.getAllByRole('button', { name: /^Eliminar a/ })
    await user.click(firstDeleteButton as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Eliminar investigador' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(fetchMock).toHaveBeenCalledWith(`/api/researchers/${firstPerson?.id}`, {
      method: 'DELETE',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  test('POSTs a new researcher and refreshes the page once creation succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ researcher: {} }) })
    mocks.uploadResearcherImage.mockResolvedValue({
      ok: true,
      imageUrl: 'https://s3.example/lasce/foto.png',
    })
    // jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
    renderEditMode()

    await user.click(screen.getByRole('button', { name: 'Añadir investigador' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir investigador' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Rol' }), 'Investigador')
    await user.type(within(dialog).getByRole('textbox', { name: 'Nombre' }), 'Persona Nueva')
    await user.type(within(dialog).getByRole('textbox', { name: 'Institución' }), 'UCR')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Descripción' }),
      'Texto de prueba.',
    )
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'foto.png', { type: 'image/png' }))

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    // Creating saves straight away: no second confirmation dialog.
    expect(screen.queryByRole('dialog', { name: 'Agregar investigador' })).not.toBeInTheDocument()

    expect(mocks.uploadResearcherImage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/researchers',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://s3.example/lasce/foto.png'),
      }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Añadir investigador' })).not.toBeInTheDocument()
    expect(await screen.findByText('Investigador agregado correctamente.')).toBeInTheDocument()
  })

  test('explains a failed researcher creation inside "Añadir investigador" and keeps the form', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'No tiene permisos para modificar este contenido.' }),
    })
    renderEditMode()

    await user.click(screen.getByRole('button', { name: 'Añadir investigador' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir investigador' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Rol' }), 'Investigador')
    await user.type(within(dialog).getByRole('textbox', { name: 'Nombre' }), 'Persona Nueva')
    await user.type(within(dialog).getByRole('textbox', { name: 'Institución' }), 'UCR')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(
      await within(dialog).findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Añadir investigador' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Nombre' })).toHaveValue('Persona Nueva')
    expect(screen.queryByText('Investigador agregado correctamente.')).not.toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('renders the page in English when provided English content', () => {
    const englishContent = getRosacInfoContent(getMessages('en'))
    renderPage({ ...defaultArgs, content: englishContent }, 'en')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Santa Cruz Radio Observatory (ROSAC)',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '1. Main characteristics' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '2. Location' })).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: '3. What do we develop at ROSAC?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '4. ROSAC construction' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '5. Why observe in radio?' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '6. Scientific instruments' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View ROSAC-SABER simulation' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'View ROSAC-MIRA 9GHz simulation' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View ROSAC-HIROS simulation' })).toBeDisabled()
    expect(screen.getByText('Band between 100 and 1000 MHz')).toBeInTheDocument()
    expect(screen.getByText('9 GHz band')).toBeInTheDocument()
    expect(screen.getByText('Neutral hydrogen observation at 1.4 GHz')).toBeInTheDocument()
    expect(screen.queryByText('Consultar simulación del ROSAC-SABER')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prysmian donation' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Donación Prysmian' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '11-meter antenna' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Antena de 11 metros' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Preparation for assembly' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Preparación para el montaje' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Principal Investigator')).toBeInTheDocument()
    expect(screen.queryByText('Investigadora principal')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Responsible for strategic planning of the resources needed for proper assembly and installation of the radio telescope, as well as lead in the management and analysis of data obtained through this instrument.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/^Institution:/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/^Institución:/)).not.toBeInTheDocument()
  })

  test('offers editing but strictly NO add or delete on characteristics (Section 1)', () => {
    renderEditMode()
    const section = screen.getByRole('region', { name: '1. Características principales' })
    const editButtons = within(section).getAllByRole('button', { name: /^Editar / })
    expect(editButtons).toHaveLength(4)
    expect(within(section).queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /Añadir/ })).not.toBeInTheDocument()
  })

  test('edits a characteristic and updates it in place (Section 1)', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    renderEditMode()
    const section = screen.getByRole('region', { name: '1. Características principales' })
    const [firstEditBtn] = within(section).getAllByRole('button', { name: /^Editar / })
    await user.click(firstEditBtn as HTMLElement)

    const dialog = screen.getByRole('dialog', { name: 'Editar "Antena de 11 metros"' })
    const titleInput = within(dialog).getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Antena Actualizada')
    await user.click(within(dialog).getByRole('tab', { name: /^English/ }))
    const enTitleInput = within(dialog).getByRole('textbox', { name: 'Título (English)' })
    await user.clear(enTitleInput)
    await user.type(enTitleInput, 'Updated Antenna')

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rosac/characteristics/antenna',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(within(section).getByRole('heading', { name: 'Antena Actualizada' })).toBeInTheDocument()
  })

  test('offers editing but strictly NO add or delete on scientific activities (Section 3)', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    renderEditMode()
    const section = screen.getByRole('region', { name: '3. ¿Qué desarrollamos en ROSAC?' })
    expect(within(section).getAllByRole('button', { name: /^Editar / })).toHaveLength(
      defaultArgs.content.activities.items.length,
    )
    expect(within(section).queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /Añadir/ })).not.toBeInTheDocument()

    // Edit an activity
    const firstActivity = defaultArgs.content.activities.items[0]!
    await user.click(within(section).getByRole('button', { name: `Editar ${firstActivity.title}` }))
    const dialog = screen.getByRole('dialog', { name: `Editar "${firstActivity.title}"` })
    const titleInput = within(dialog).getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Radioastronomía Avanzada')
    await user.click(within(dialog).getByRole('tab', { name: /^English/ }))
    const enTitleInput = within(dialog).getByRole('textbox', { name: 'Título (English)' })
    await user.clear(enTitleInput)
    await user.type(enTitleInput, 'Advanced Radio Astronomy')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/rosac/activities/${firstActivity.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(
      within(section).getByRole('heading', { name: 'Radioastronomía Avanzada' }),
    ).toBeInTheDocument()
  })

  test('offers editing but strictly NO add or delete on construction stages (Section 4)', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    renderEditMode()
    const section = screen.getByRole('region', { name: '4. Construcción del ROSAC' })
    expect(within(section).getByRole('button', { name: 'Editar etapa' })).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /Añadir/ })).not.toBeInTheDocument()

    // Edit current stage
    await user.click(within(section).getByRole('button', { name: 'Editar etapa' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar "Preparación para el montaje"' })
    const titleInput = within(dialog).getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Preparación Avanzada')
    await user.click(within(dialog).getByRole('tab', { name: /^English/ }))
    const enTitleInput = within(dialog).getByRole('textbox', { name: 'Título (English)' })
    await user.clear(enTitleInput)
    await user.type(enTitleInput, 'Advanced Preparation')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/rosac\/stages\//),
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(
      within(section).getByRole('heading', { name: 'Preparación Avanzada' }),
    ).toBeInTheDocument()
  })

  test('offers create, edit and delete on scientific instruments (Section 6)', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ instrument: { id: 'new-inst' } }),
    })
    renderEditMode()
    const section = screen.getByRole('region', { name: '6. Instrumentos científicos' })
    expect(within(section).getAllByRole('button', { name: /^Editar / })).toHaveLength(3)
    expect(within(section).getAllByRole('button', { name: /^Eliminar / })).toHaveLength(3)
    expect(within(section).getByRole('button', { name: 'Añadir instrumento' })).toBeInTheDocument()

    // Add a new instrument
    mocks.uploadInstrumentImage.mockResolvedValueOnce({
      ok: true,
      imageUrl: 'https://s3.example/lasce/instrumento.png',
    })
    await user.click(within(section).getByRole('button', { name: 'Añadir instrumento' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir instrumento' })
    await user.type(
      within(addDialog).getByRole('textbox', { name: 'Nombre (Español)' }),
      'Polarímetro',
    )
    await user.type(
      within(addDialog).getByRole('textbox', { name: 'Descripción (Español)' }),
      'Medición de ondas.',
    )
    await user.click(within(addDialog).getByRole('tab', { name: /^English/ }))
    await user.type(
      within(addDialog).getByRole('textbox', { name: 'Nombre (English)' }),
      'Polarimeter',
    )
    await user.type(
      within(addDialog).getByRole('textbox', { name: 'Descripción (English)' }),
      'Wave measurement.',
    )
    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'instrumento.png', { type: 'image/png' }))
    await user.click(within(addDialog).getByRole('button', { name: 'Confirmar' }))

    expect(within(section).getByRole('heading', { name: 'Polarímetro' })).toBeInTheDocument()

    // Delete the newly added instrument
    const deleteBtn = within(section).getByRole('button', {
      name: 'Eliminar Polarímetro',
    })
    await user.click(deleteBtn)
    const deleteConfirmDialog = screen.getByRole('dialog', { name: 'Eliminar instrumento' })
    await user.click(within(deleteConfirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(within(section).queryByRole('heading', { name: 'Polarímetro' })).not.toBeInTheDocument()
  })

  test('offers editing an existing acknowledgment', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ acknowledgment: { id: 'ack-1' } }),
    })
    renderEditMode()
    const section = screen.getByRole('region', { name: '9. Agradecimientos ROSAC' })
    const initialCount = defaultArgs.content.acknowledgments.institutions.length
    expect(within(section).getAllByRole('button', { name: /^Editar / })).toHaveLength(initialCount)
    expect(within(section).getAllByRole('button', { name: /^Eliminar / })).toHaveLength(
      initialCount,
    )

    const firstInst = defaultArgs.content.acknowledgments.institutions[0]!
    await user.click(within(section).getByRole('button', { name: `Editar ${firstInst.name}` }))
    const editDialog = screen.getByRole('dialog', { name: 'Editar institución' })
    const editNameInput = within(editDialog).getByRole('textbox', {
      name: 'Nombre de la institución',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'UCR Modificada')
    await user.click(within(editDialog).getByRole('button', { name: 'Guardar cambios' }))

    expect(within(section).getByText('UCR Modificada')).toBeInTheDocument()
  })

  test('offers create and delete on acknowledgments', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ acknowledgment: { id: 'new-ack' } }),
    })
    renderEditMode()
    const section = screen.getByRole('region', { name: '9. Agradecimientos ROSAC' })
    expect(within(section).getByRole('button', { name: 'Añadir institución' })).toBeInTheDocument()

    // 1. Add an acknowledgment using preset logo and custom name
    await user.click(within(section).getByRole('button', { name: 'Añadir institución' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir institución' })
    const select = within(addDialog).getByRole('combobox', {
      name: 'Escoger un logo personalizado o seleccionar uno de la lista',
    })
    await user.selectOptions(select, '1')
    const addNameInput = within(addDialog).getByRole('textbox', {
      name: 'Nombre de la institución',
    })
    await user.clear(addNameInput)
    await user.type(addNameInput, 'Nueva Institución')
    await user.click(within(addDialog).getByRole('button', { name: 'Agregar institución' }))

    expect(within(section).getByText('Nueva Institución')).toBeInTheDocument()

    // 2. Delete the newly added acknowledgment
    const deleteBtn = within(section).getByRole('button', {
      name: 'Eliminar Nueva Institución',
    })
    await user.click(deleteBtn)
    const deleteConfirmDialog = screen.getByRole('dialog', { name: 'Eliminar institución' })
    await user.click(within(deleteConfirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(within(section).queryByText('Nueva Institución')).not.toBeInTheDocument()
  })

  test('does not read or write to localStorage for any ROSAC CMS content', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    try {
      renderPage()
      const rosacGetCalls = getItemSpy.mock.calls.filter(([key]) => /rosac/i.test(key))
      expect(rosacGetCalls).toHaveLength(0)
      expect(setItemSpy).not.toHaveBeenCalled()
    } finally {
      getItemSpy.mockRestore()
      setItemSpy.mockRestore()
    }
  })
})
