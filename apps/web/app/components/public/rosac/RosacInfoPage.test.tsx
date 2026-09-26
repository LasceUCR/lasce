import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

// `RosacInfoPage.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  uploadResearcherImage: vi.fn(),
}))

// `RosacInfoPage` calls `useRouter()` to refresh after a create/edit/delete,
// which throws outside a mounted app router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadResearcherImage: mocks.uploadResearcherImage,
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { RosacInfoPage, type RosacInfoPageProps } from './RosacInfoPage'
import { Default, EditMode } from './RosacInfoPage.stories'

const defaultArgs = Default.args as RosacInfoPageProps
const editModeArgs = EditMode.args as RosacInfoPageProps

afterEach(() => {
  vi.clearAllMocks()
})

function renderPage(props: RosacInfoPageProps = defaultArgs) {
  return render(
    <EditModeProvider>
      <RosacInfoPage {...props} />
    </EditModeProvider>,
  )
}

function renderEditMode(props: RosacInfoPageProps = editModeArgs) {
  return render(
    <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
      <RosacInfoPage {...props} />
    </EditModeContext.Provider>,
  )
}

describe('RosacInfoPage', () => {
  test('places construction after development and renumbers only the following numbered sections', () => {
    renderPage()

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent?.trim())
    expect(headings.filter((heading) => /^\d\./.test(heading ?? ''))).toEqual([
      '1. Características principales',
      '2. ¿Qué desarrollamos en ROSAC?',
      '3. Construcción del ROSAC',
      '4. ¿Por qué observar en radio?',
      '5. Investigadores',
    ])
    expect(screen.getByRole('region', { name: '3. Construcción del ROSAC' })).toHaveTextContent(
      defaultArgs.content.construction.intro,
    )
  })

  test('explains the observatory purpose, characteristics and relationship with LASCE', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Radioastronomía' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: defaultArgs.content.hero.image.alt })).toHaveAttribute(
      'src',
      defaultArgs.content.hero.image.src,
    )
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

  test('shows an enabled scientific consultation button without creating a navigation link', () => {
    renderPage()

    const consultation = screen.getByRole('region', { name: 'Consulta científica' })
    expect(within(consultation).queryByText('Próximamente')).not.toBeInTheDocument()
    const button = within(consultation).getByRole('button', {
      name: 'Consultar información científica',
    })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('type', 'button')
    expect(button).not.toHaveAttribute('href')
    expect(within(consultation).queryByRole('link')).not.toBeInTheDocument()
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
        within(team).getAllByText(`Institución: ${person.institution}`).length,
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
    const confirmDialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/researchers/${firstPerson?.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Editar investigador' })).not.toBeInTheDocument()
  })

  test('DELETEs the researcher and refreshes the page once removal succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true })
    renderEditMode()
    const [firstPerson] = editModeArgs.content.team.people

    const [firstDeleteButton] = screen.getAllByRole('button', { name: /^Eliminar a/ })
    await user.click(firstDeleteButton as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Eliminar investigador' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

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
    const confirmDialog = screen.getByRole('dialog', { name: 'Agregar investigador' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadResearcherImage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/researchers',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://s3.example/lasce/foto.png'),
      }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
