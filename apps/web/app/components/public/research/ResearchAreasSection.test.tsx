import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ResearchAreasSection, type ResearchAreasSectionProps } from './ResearchAreasSection'
import { Default, Empty } from './ResearchAreasSection.stories'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('./ResearchAreaForm', () => ({
  ResearchAreaForm: ({
    onSave,
    onCancel,
  }: {
    onSave: (values: { title: string; description: string; src: string }) => void
    onCancel: () => void
  }) => (
    <div>
      <button
        onClick={() => onSave({ title: 'Área creada', description: 'Descripción', src: '' })}
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
const firstArea = defaultArgs.areas[0]

if (!firstArea) throw new Error('The default research areas story must contain an area.')

function renderCreateSection() {
  return render(
    <EditModeContext.Provider value={{ editMode: true, setEditMode: vi.fn() }}>
      <ResearchAreasSection
        areas={[]}
        canCreate
        subtitle="Áreas de investigación"
        title="Investigación"
      />
    </EditModeContext.Provider>,
  )
}

function renderSection(props: ResearchAreasSectionProps) {
  return render(
    <EditModeContext.Provider value={{ editMode: false, setEditMode: vi.fn() }}>
      <ResearchAreasSection {...props} />
    </EditModeContext.Provider>,
  )
}

function renderEditableSection() {
  return render(
    <EditModeContext.Provider value={{ editMode: true, setEditMode: vi.fn() }}>
      <ResearchAreasSection {...defaultArgs} canDelete canEdit />
    </EditModeContext.Provider>,
  )
}

function clickFirstButton(name: string) {
  const button = screen.getAllByRole('button', { name }).at(0)
  if (!button) throw new Error(`Expected a button named "${name}".`)
  fireEvent.click(button)
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ResearchAreasSection', () => {
  test('lists one item per research area it is given', () => {
    renderSection(defaultArgs)

    const list = screen.getByRole('list')

    expect(within(list).getAllByRole('listitem')).toHaveLength(defaultArgs.areas.length)
  })

  test('shows every research area with its title and description', () => {
    renderSection(defaultArgs)

    for (const area of defaultArgs.areas) {
      const card = screen.getByRole('article', { name: area.title })

      expect(within(card).getByRole('heading', { level: 3, name: area.title })).toBeInTheDocument()
      expect(within(card).getByText(area.description)).toBeInTheDocument()
    }
  })

  test('links each research area to its own detail page', () => {
    renderSection(defaultArgs)

    expect(screen.getAllByRole('link')).toHaveLength(defaultArgs.areas.length)

    for (const area of defaultArgs.areas) {
      expect(
        screen.getByRole('link', { name: `Conozca más sobre esta área (${area.title})` }),
      ).toHaveAttribute('href', `/investigacion/areas/${area.id}`)
    }
  })

  test('renders no list and no links when there are no research areas', () => {
    renderSection(emptyArgs)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  test('posts a new area and closes the form after success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    renderCreateSection()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/research-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Área creada', description: 'Descripción', src: '' }),
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows the API error and leaves the form open', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    renderCreateSection()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('patches an area, closes the editor, and refreshes after success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    renderEditableSection()
    clickFirstButton('Editar')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(`/api/research-areas/${firstArea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Área creada', description: 'Descripción', src: '' }),
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows a PATCH API error and keeps the editor open', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    renderEditableSection()
    clickFirstButton('Editar')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('deletes an area and refreshes after confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    renderEditableSection()
    clickFirstButton('Eliminar')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(`/api/research-areas/${firstArea.id}`, {
      method: 'DELETE',
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  test('shows a DELETE API error without refreshing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    renderEditableSection()
    clickFirstButton('Eliminar')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado.')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
