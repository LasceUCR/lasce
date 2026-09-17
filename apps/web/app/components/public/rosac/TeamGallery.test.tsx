import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

// `TeamGallery.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import { TeamGallery, type TeamGalleryProps } from './TeamGallery'
import { Default, Empty, PlainName } from './TeamGallery.stories'

const defaultArgs = Default.args as TeamGalleryProps
const emptyArgs = Empty.args as TeamGalleryProps
const plainNameArgs = PlainName.args as TeamGalleryProps
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function renderGallery(props: TeamGalleryProps) {
  return render(
    <EditModeProvider>
      <TeamGallery {...props} />
    </EditModeProvider>,
  )
}

function renderGalleryInEditMode(props: TeamGalleryProps) {
  return render(
    <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
      <TeamGallery {...props} />
    </EditModeContext.Provider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('TeamGallery', () => {
  test('renders one slide per person', () => {
    renderGallery(defaultArgs)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    expect(within(track).getAllByRole('listitem')).toHaveLength(defaultArgs.people.length)
  })

  test('shows the role, name, institution and description of every person', () => {
    renderGallery(defaultArgs)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    for (const person of defaultArgs.people) {
      expect(within(track).getByText(person.name)).toBeInTheDocument()
      expect(within(track).getByText(person.description)).toBeInTheDocument()
      expect(within(track).getByText(`Institución: ${person.institution}`)).toBeInTheDocument()
    }
  })

  test('links public emails when they were supplied', () => {
    renderGallery(defaultArgs)

    for (const person of defaultArgs.people) {
      if (!person.email) {
        continue
      }

      expect(screen.getByRole('link', { name: person.email })).toHaveAttribute(
        'href',
        `mailto:${person.email}`,
      )
    }
  })

  test('shows the role each person holds', () => {
    renderGallery(defaultArgs)

    expect(screen.getByText('Investigadora principal')).toBeInTheDocument()
  })

  test('renders a person who has no academic title', () => {
    renderGallery(plainNameArgs)

    expect(screen.getByText('Jelmuth Rojas')).toBeInTheDocument()
    expect(screen.getByText('Colaborador externo')).toBeInTheDocument()
  })

  test('keeps the cards out of the accessibility tree so nothing is announced twice', () => {
    const { container } = renderGallery(defaultArgs)

    // Every word in the card is already rendered as text beside it, so alt text would repeat
    // each person in full.
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(defaultArgs.people.length)
    defaultArgs.people.forEach((person, index) => {
      expect(images[index]).toHaveAttribute('alt', '')
      expect(images[index]).toHaveAttribute('src', person.src)
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('exposes the scroll track to the keyboard', () => {
    renderGallery(defaultArgs)

    // Without this a scrollable region is unreachable by keyboard, which axe flags.
    expect(screen.getByRole('list', { name: defaultArgs.label })).toHaveAttribute('tabindex', '0')
  })

  test('names both scroll controls', () => {
    renderGallery(defaultArgs)

    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveAttribute('type', 'button')
  })

  test('scrolls the track in both directions from the controls', async () => {
    const user = userEvent.setup()
    renderGallery(defaultArgs)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    const scrollBy = vi.fn()
    // jsdom implements neither scrollBy nor layout, so both are stubbed here.
    Object.defineProperty(track, 'scrollBy', { value: scrollBy, writable: true })
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 600 })

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', left: 360 })

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', left: -360 })
  })

  test('explains when no researcher information is available', () => {
    renderGallery(emptyArgs)

    expect(screen.getByRole('status')).toHaveTextContent(emptyArgs.emptyMessage)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('hides the edit affordances when edit mode is off', () => {
    renderGallery(defaultArgs)

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  test('offers editing and deleting each researcher when edit mode is on', () => {
    renderGalleryInEditMode(defaultArgs)

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(
      defaultArgs.people.length,
    )
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(
      defaultArgs.people.length,
    )
  })

  test('opens the edit modal pre-filled for the researcher being edited', async () => {
    const user = userEvent.setup()
    renderGalleryInEditMode(defaultArgs)
    const [firstResearcher] = defaultArgs.people

    const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
    await user.click(firstEditButton as HTMLElement)

    const dialog = screen.getByRole('dialog', { name: `Editar "${firstResearcher?.name}"` })
    expect(within(dialog).getByRole('textbox', { name: 'Nombre' })).toHaveValue(
      firstResearcher?.name,
    )
    expect(within(dialog).getByRole('textbox', { name: 'Institución' })).toHaveValue(
      firstResearcher?.institution,
    )
  })

  test('asks for confirmation before deleting a researcher', async () => {
    const user = userEvent.setup()
    renderGalleryInEditMode(defaultArgs)

    const [firstDeleteButton] = screen.getAllByRole('button', { name: 'Eliminar' })
    await user.click(firstDeleteButton as HTMLElement)

    expect(screen.getByRole('dialog', { name: 'Eliminar investigador' })).toBeInTheDocument()
  })

  test('does not offer "Añadir" outside edit mode', () => {
    renderGallery(defaultArgs)

    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument()
  })

  test('opens a blank form when "Añadir" is clicked in edit mode', async () => {
    const user = userEvent.setup()
    renderGalleryInEditMode(defaultArgs)

    await user.click(screen.getByRole('button', { name: 'Añadir' }))

    const dialog = screen.getByRole('dialog', { name: 'Añadir' })
    expect(within(dialog).getByRole('textbox', { name: 'Nombre' })).toHaveValue('')
    expect(within(dialog).getByRole('textbox', { name: 'Rol' })).toHaveValue('')
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('shows a hint to use "Añadir" when there are no researchers yet', () => {
    renderGalleryInEditMode(emptyArgs)

    expect(
      screen.getByText('Haga clic en "Añadir" para agregar un investigador.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument()
  })

  test('PATCHes the researcher and refreshes the page once saving succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ researcher: {} }) })
    renderGalleryInEditMode(defaultArgs)
    const [firstResearcher] = defaultArgs.people

    const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
    await user.click(firstEditButton as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/researchers/${firstResearcher?.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('dialog', { name: `Editar "${firstResearcher?.name}"` }),
    ).not.toBeInTheDocument()
  })

  test('shows the server error and keeps the edit modal open when saving fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No tiene permisos para modificar este contenido.' }),
    })
    renderGalleryInEditMode(defaultArgs)
    const [firstResearcher] = defaultArgs.people

    const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
    await user.click(firstEditButton as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: `Editar "${firstResearcher?.name}"` }),
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('DELETEs the researcher and refreshes the page once deletion succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    renderGalleryInEditMode(defaultArgs)
    const [firstResearcher] = defaultArgs.people

    const [firstDeleteButton] = screen.getAllByRole('button', { name: 'Eliminar' })
    await user.click(firstDeleteButton as HTMLElement)
    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar investigador' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/researchers/${firstResearcher?.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  test('shows an error message when deletion fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No se pudo eliminar al investigador.' }),
    })
    renderGalleryInEditMode(defaultArgs)

    const [firstDeleteButton] = screen.getAllByRole('button', { name: 'Eliminar' })
    await user.click(firstDeleteButton as HTMLElement)
    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar investigador' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('No se pudo eliminar al investigador.')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('creates a researcher through "Añadir", uploading a photo, and refreshes on success', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-photo-url')
    URL.revokeObjectURL = vi.fn()
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ researcher: {} }) })
    renderGalleryInEditMode(defaultArgs)

    await user.click(screen.getByRole('button', { name: 'Añadir' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir' })

    const fileInput = addDialog.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('File input not found')
    const photo = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput as HTMLInputElement, photo)

    await user.type(within(addDialog).getByRole('textbox', { name: 'Nombre' }), 'Persona Nueva')
    await user.type(within(addDialog).getByRole('textbox', { name: 'Rol' }), 'Investigador')
    await user.type(within(addDialog).getByRole('textbox', { name: 'Institución' }), 'UCR')
    await user.type(
      within(addDialog).getByRole('textbox', { name: 'Descripción' }),
      'Texto de prueba',
    )
    await user.click(within(addDialog).getByRole('button', { name: 'Confirmar' }))

    const confirmDialog = screen.getByRole('dialog', { name: 'Agregar investigador' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/researchers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          src: 'blob:mock-photo-url',
          role: 'Investigador',
          name: 'Persona Nueva',
          institution: 'UCR',
          description: 'Texto de prueba',
        }),
      }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Añadir' })).not.toBeInTheDocument()
  })
})
