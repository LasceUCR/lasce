import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { ScientificToolsManager, type ScientificToolsManagerProps } from './ScientificToolsManager'
import { Editable } from './ScientificToolsManager.stories'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
const fetchMock = vi.fn()
const args = Editable.args as ScientificToolsManagerProps
const [swaat] = args.tools

function renderManager(
  props: Partial<ScientificToolsManagerProps> = {},
  editMode = true,
  locale: 'es' | 'en' = 'es',
) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <ScientificToolsManager {...args} {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

describe('ScientificToolsManager', () => {
  test('lists every tool for visitors without any editing control', () => {
    renderManager({}, false)

    expect(screen.getAllByRole('article')).toHaveLength(2)
    for (const tool of args.tools) {
      expect(screen.getByRole('link', { name: `Acceder a ${tool.name}` })).toHaveAttribute(
        'href',
        tool.href,
      )
    }
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('hides the controls in edit mode from an account without the grants', () => {
    renderManager({ canCreate: false, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('shows the empty-state message when there are no tools', () => {
    renderManager({ tools: [] }, false)

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay herramientas científicas disponibles en este momento.',
    )
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  test('adds a tool and reports it with a toast', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response('{"tool":{"id":"new"}}', { status: 201 }))
    renderManager({ tools: [] })

    await user.click(screen.getByRole('button', { name: 'Añadir herramienta científica' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir herramienta científica' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'SOLAR')
    await user.type(
      within(dialog).getByRole('textbox', { name: /Descripción \(Español\)/ }),
      'Descripción.',
    )
    await user.type(
      within(dialog).getByRole('textbox', { name: /Enlace de acceso/ }),
      'https://solar.example.com',
    )
    await user.click(within(dialog).getByRole('tab', { name: /English/ }))
    await user.type(
      within(dialog).getByRole('textbox', { name: /Descripción \(English\)/ }),
      'Description.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Herramienta científica agregada correctamente.')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith('/api/scientific-tools', expect.anything())
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      name: 'SOLAR',
      accessUrl: 'https://solar.example.com',
      imageUrl: '',
      content: { es: { description: 'Descripción.' }, en: { description: 'Description.' } },
    })
    expect(refresh).toHaveBeenCalledOnce()
  })

  test('keeps an edit after a failed save, then saves it on retry', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'No se pudo conectar.' }), { status: 500 }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    renderManager()

    await user.click(screen.getByRole('button', { name: `Editar herramienta ${swaat!.name}` }))
    const url = screen.getByRole('textbox', { name: /Enlace de acceso/ })
    await user.clear(url)
    await user.type(url, 'https://swaat.example.com/new')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('No se pudo conectar.')).toBeVisible()
    expect(url).toHaveValue('https://swaat.example.com/new')
    expect(refresh).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(
      await screen.findByText('Herramienta científica actualizada correctamente.'),
    ).toBeVisible()
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/scientific-tools/${swaat!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessUrl: 'https://swaat.example.com/new',
        version: swaat!.editing!.version,
      }),
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(refresh).toHaveBeenCalledOnce()
  })

  test('shows a server validation message beside the field it names', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'invalid-body',
          error: 'Revise los campos.',
          issues: [{ path: 'name', message: 'El nombre es obligatorio.' }],
        }),
        { status: 400 },
      ),
    )
    renderManager()

    await user.click(screen.getByRole('button', { name: `Editar herramienta ${swaat!.name}` }))
    await user.type(screen.getByRole('textbox', { name: /^Nombre/ }), ' 2')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const name = screen.getByRole('textbox', { name: /^Nombre/ })
    expect(await screen.findByText('El nombre es obligatorio.')).toBeVisible()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveFocus()
  })

  test('reports a conflict in the site language and keeps the form open', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Cambió.' }), { status: 409 }))
    renderManager({}, true, 'en')

    await user.click(screen.getByRole('button', { name: `Edit tool ${swaat!.name}` }))
    await user.type(screen.getByRole('textbox', { name: /^Name/ }), ' 2')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(
      await screen.findByText(
        'The scientific tool has changed. Reopen the form to load the current version.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('dialog', { name: 'Edit scientific tool' })).toBeVisible()
  })

  test('uploads a chosen image before saving the tool', async () => {
    const user = userEvent.setup()
    const imageUrl = '/api/scientific-tools/images/38300000-0000-4000-8000-000000000009.png'
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ imageUrl }), { status: 201 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    renderManager()

    await user.click(screen.getByRole('button', { name: `Editar herramienta ${swaat!.name}` }))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input, new File(['png'], 'tool.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('Herramienta científica actualizada correctamente.'),
    ).toBeVisible()
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/scientific-tools/images?mode=edit')
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      imageUrl,
      version: swaat!.editing!.version,
    })
  })

  test('asks before deleting and refreshes once the tool is gone', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    renderManager()

    await user.click(screen.getByRole('button', { name: `Eliminar herramienta ${swaat!.name}` }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar herramienta científica' })
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Herramienta científica eliminada correctamente.')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(`/api/scientific-tools/${swaat!.id}`, {
      method: 'DELETE',
    })
    expect(refresh).toHaveBeenCalledOnce()
  })

  test('says why a delete was refused', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }))
    renderManager()

    await user.click(screen.getByRole('button', { name: `Eliminar herramienta ${swaat!.name}` }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(
      await screen.findByText(
        'No tiene permisos para realizar esta acción. Inicie sesión con una cuenta autorizada.',
      ),
    ).toBeVisible()
    expect(refresh).not.toHaveBeenCalled()
  })
})
