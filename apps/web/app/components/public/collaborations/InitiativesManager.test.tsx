import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { InitiativesManager, type InitiativesManagerProps } from './InitiativesManager'
import { Editable } from './InitiativesManager.stories'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
const fetchMock = vi.fn()
const args = Editable.args as InitiativesManagerProps
function renderManager(
  props: Partial<InitiativesManagerProps> = {},
  editMode = true,
  locale: 'es' | 'en' = 'es',
) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <InitiativesManager {...args} {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

describe('InitiativesManager', () => {
  test('hides all actions without permission even when edit mode is enabled', () => {
    renderManager({ canCreate: false, canEdit: false, canDelete: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iniciativa de prueba' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sitio web oficial' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
  })
  test('hides editing actions outside edit mode', () => {
    renderManager({}, false)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
  test('keeps the add action accessible for an empty directory', async () => {
    const user = userEvent.setup()
    renderManager({ initiatives: [] })
    await user.click(screen.getByRole('button', { name: 'Añadir iniciativa' }))
    expect(screen.getByRole('dialog', { name: 'Añadir iniciativa' })).toBeVisible()
    expect(screen.getByLabelText(/Sitio web oficial/)).toHaveValue('')
  })
  test('retains edits after a failed request, then saves and refreshes on retry', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Inténtelo de nuevo.' }), { status: 500 }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Editar iniciativa Iniciativa de prueba' }))
    await user.type(screen.getByLabelText(/Sitio web oficial/), '/updated')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Inténtelo de nuevo.')).toBeVisible()
    expect(screen.getByLabelText(/Sitio web oficial/)).toHaveValue('https://example.com/updated')
    expect(refresh).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Iniciativa actualizada correctamente.')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(refresh).toHaveBeenCalledOnce()
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      websiteUrl: 'https://example.com/updated',
      version: args.initiatives[0]!.editing!.version,
    })
  })
  test('requires explicit delete confirmation and refreshes only after success', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    renderManager()
    await user.click(
      screen.getByRole('button', { name: 'Eliminar iniciativa Iniciativa de prueba' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Eliminar iniciativa' })
    expect(
      within(dialog).getByText(
        '¿Desea eliminar esta iniciativa? Esta acción no se puede deshacer.',
      ),
    ).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', { name: 'Eliminar iniciativa Iniciativa de prueba' }),
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Iniciativa eliminada correctamente.')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(`/api/initiatives/${args.initiatives[0]!.id}`, {
      method: 'DELETE',
    })
    expect(refresh).toHaveBeenCalledOnce()
  })
  test('shows conflicts in the site language and retains the edit', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'La iniciativa cambió.' }), { status: 409 }),
    )
    renderManager({}, true, 'en')
    await user.click(screen.getByRole('button', { name: 'Edit initiative Iniciativa de prueba' }))
    await user.type(screen.getByLabelText(/Official website/), '/updated')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(
      await screen.findByText(
        'The initiative changed. Reopen the form to load the current version.',
      ),
    ).toBeVisible()
    expect(screen.getByLabelText(/Official website/)).toHaveValue('https://example.com/updated')
    expect(refresh).not.toHaveBeenCalled()
  })
  test('shows server validation beside the affected field and clears it after correction', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'invalid-body',
            error: 'Revise el enlace.',
            issues: [{ path: 'websiteUrl', message: 'Este enlace no es válido.' }],
          }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Editar iniciativa Iniciativa de prueba' }))
    const website = screen.getByRole('textbox', { name: /Sitio web oficial/ })
    await user.type(website, '/rejected')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Este enlace no es válido.')).toBeVisible()
    expect(website).toHaveAttribute('aria-invalid', 'true')
    expect(website).toHaveFocus()
    await user.clear(website)
    await user.type(website, 'https://example.org')
    expect(website).not.toHaveAttribute('aria-invalid', 'true')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Iniciativa actualizada correctamente.')).toBeVisible()
  })
})
