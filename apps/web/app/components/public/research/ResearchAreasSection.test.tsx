import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ResearchAreasSection, type ResearchAreasSectionProps } from './ResearchAreasSection'
import { Default, EditMode, Empty } from './ResearchAreasSection.stories'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

/** What the stand-in form saves: new text in both languages and a new photo. */
const savedDraft = {
  es: { title: 'Área creada', description: 'Descripción.' },
  en: { title: 'Created area', description: 'Description.' },
}

// The form has its own tests; here it only hands back a result, or cancels.
vi.mock('./ResearchAreaForm', () => ({
  ResearchAreaForm: ({
    onSave,
    onCancel,
  }: {
    onSave: (result: { draft: typeof savedDraft; confirmed: []; src: string }) => void
    onCancel: () => void
  }) => (
    <div>
      <button
        onClick={() => onSave({ draft: savedDraft, confirmed: [], src: '/creada.jpg' })}
        type="button"
      >
        Guardar prueba
      </button>
      <button onClick={onCancel} type="button">
        Cancelar prueba
      </button>
    </div>
  ),
}))

const defaultArgs = Default.args as ResearchAreasSectionProps
const emptyArgs = Empty.args as ResearchAreasSectionProps
const editArgs = EditMode.args as ResearchAreasSectionProps
const firstArea = defaultArgs.areas[0]
const editedArea = editArgs.areas[0]

if (!firstArea || !editedArea) throw new Error('The research areas stories must contain areas.')

function renderSection(props: ResearchAreasSectionProps, editMode = false) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: vi.fn() }}>
        <ResearchAreasSection {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

function answer(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function deleteFirstArea() {
  fireEvent.click(screen.getByRole('button', { name: `Eliminar ${editedArea?.title}` }))
  const dialog = screen.getByRole('dialog', { name: 'Eliminar área de investigación' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ResearchAreasSection', () => {
  test('lists one item per research area it is given', () => {
    renderSection(defaultArgs)

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(
      defaultArgs.areas.length,
    )
  })

  test('marks each card with the language its text is in', () => {
    renderSection({
      ...defaultArgs,
      areas: [
        { ...firstArea, contentLocale: 'en' },
        { ...firstArea, id: 'legacy-area', title: 'Área sin traducción', contentLocale: null },
      ],
    })

    expect(screen.getByRole('heading', { name: firstArea.title })).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('heading', { name: 'Área sin traducción' })).toHaveAttribute('lang', '')
  })

  test('shows every research area with its title and description', () => {
    renderSection(defaultArgs)

    for (const area of defaultArgs.areas) {
      const card = screen.getByRole('article', { name: area.title })
      expect(within(card).getByText(area.description)).toBeInTheDocument()
    }
  })

  test('links each research area to its own detail page', () => {
    renderSection(defaultArgs)

    for (const area of defaultArgs.areas) {
      expect(
        screen.getByRole('link', { name: `Conozca más sobre esta área (${area.title})` }),
      ).toHaveAttribute('href', `/investigacion/areas/${area.id}`)
    }
  })

  test('renders no list and no links when there are no research areas', () => {
    renderSection(emptyArgs)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('offers no editing controls outside edit mode', () => {
    renderSection(editArgs)

    expect(
      screen.queryByRole('button', { name: /Editar|Eliminar|Agregar/ }),
    ).not.toBeInTheDocument()
  })

  test('posts a new area in both languages, closes the form and says so', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(201, { area: { id: 'new' } }))
    vi.stubGlobal('fetch', fetchMock)

    renderSection(editArgs, true)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar área de investigación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/research-areas')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ content: savedDraft, src: '/creada.jpg' })
    expect(
      await screen.findByText('Área de investigación agregada correctamente.'),
    ).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test("shows the server's reason in a toast and leaves the form open", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(403, { error: 'No autorizado.' })))

    renderSection(editArgs, true)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar área de investigación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    const dialog = screen.getByRole('dialog', { name: 'Agregar área de investigación' })
    // The toast renders inside the open modal, where the admin is.
    expect(await within(dialog).findByText('No autorizado.')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('patches an area against its version with what changed, then closes and refreshes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(200, { area: { id: editedArea.id } }))
    vi.stubGlobal('fetch', fetchMock)

    renderSection(editArgs, true)
    fireEvent.click(screen.getByRole('button', { name: `Editar ${editedArea.title}` }))
    expect(screen.getByRole('dialog', { name: `Editar "${editedArea.title}"` })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/research-areas/${editedArea.id}`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({
      version: editedArea.editing?.version,
      content: savedDraft,
      src: '/creada.jpg',
    })
    expect(
      await screen.findByText('Área de investigación actualizada correctamente.'),
    ).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows a PATCH failure in a toast and keeps the editor open', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          answer(409, { code: 'conflict', error: 'El área de investigación cambió.' }),
        ),
    )

    renderSection(editArgs, true)
    fireEvent.click(screen.getByRole('button', { name: `Editar ${editedArea.title}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('El área de investigación cambió.')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('deletes an area after its confirmation and says so', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(204))
    vi.stubGlobal('fetch', fetchMock)

    renderSection(editArgs, true)
    deleteFirstArea()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(`/api/research-areas/${editedArea.id}`, {
      method: 'DELETE',
    })
    expect(
      await screen.findByText('Área de investigación eliminada correctamente.'),
    ).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  test('shows a DELETE failure in a toast without refreshing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(403, { error: 'No autorizado.' })))

    renderSection(editArgs, true)
    deleteFirstArea()

    expect(await screen.findByText('No autorizado.')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('falls back to its own message when the server gives no reason', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html></html>', { status: 400 })),
    )

    renderSection(editArgs, true)
    deleteFirstArea()

    expect(
      await screen.findByText('No se pudo eliminar el área de investigación. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
  })

  test('labels its editing controls in the language the site is shown in', () => {
    renderWithIntl(
      <ToastProvider>
        <EditModeContext.Provider value={{ editMode: true, setEditMode: vi.fn() }}>
          <ResearchAreasSection {...editArgs} />
        </EditModeContext.Provider>
      </ToastProvider>,
      { locale: 'en' },
    )

    expect(screen.getByRole('button', { name: 'Add research area' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Edit ${editedArea.title}` })).toBeInTheDocument()
  })

  test('renders no heading and names the list by label when no title is given', () => {
    renderSection({ ...defaultArgs, title: undefined, subtitle: undefined, label: 'Áreas' })

    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Áreas' })).toBeInTheDocument()
  })
})
