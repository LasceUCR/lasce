import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { CollaborationsManager, type CollaborationsManagerProps } from './CollaborationsManager'
import { Editable } from './CollaborationsManager.stories'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
const fetchMock = vi.fn()
const args = Editable.args as CollaborationsManagerProps
function renderManager(
  props: Partial<CollaborationsManagerProps> = {},
  editMode = true,
  locale: 'es' | 'en' = 'es',
) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <CollaborationsManager {...args} {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

describe('CollaborationsManager', () => {
  test('hides all actions without permission even when edit mode is enabled', () => {
    renderManager({ canCreate: false, canEdit: false, canDelete: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Institute' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Institute' })).toHaveAttribute(
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
    renderManager({ collaborations: [] })
    await user.click(screen.getByRole('button', { name: 'Añadir colaboración' }))
    expect(screen.getByRole('dialog', { name: 'Añadir colaboración' })).toBeVisible()
    expect(screen.getByLabelText(/Nombre de la organización/)).toHaveValue('')
  })
  test('retains edits after a failed request, then saves and refreshes on retry', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Inténtelo de nuevo.' }), { status: 500 }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Editar Institute' }))
    await user.type(screen.getByLabelText(/Nombre de la organización/), ' edited')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Inténtelo de nuevo.')).toBeVisible()
    expect(screen.getByLabelText(/Nombre de la organización/)).toHaveValue('Institute edited')
    expect(refresh).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Colaboración actualizada correctamente.')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(refresh).toHaveBeenCalledOnce()
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      name: 'Institute edited',
      version: args.collaborations[0]!.editing!.version,
    })
  })
  test('requires explicit delete confirmation and refreshes only after success', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Eliminar Institute' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar colaboración' })
    expect(
      within(dialog).getByText(
        '¿Desea eliminar esta colaboración? Se quitará de la página pública y esta acción no se puede deshacer.',
      ),
    ).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Eliminar Institute' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Colaboración eliminada correctamente.')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(`/api/collaborations/${args.collaborations[0]!.id}`, {
      method: 'DELETE',
    })
    expect(refresh).toHaveBeenCalledOnce()
  })
  test('shows conflicts in the site language and retains the edit', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'La colaboración cambió.' }), { status: 409 }),
    )
    renderManager({}, true, 'en')
    await user.click(screen.getByRole('button', { name: 'Edit Institute' }))
    await user.type(screen.getByLabelText(/Organization name/), ' edited')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(
      await screen.findByText(
        'The collaboration changed. Reopen the form to load the current version.',
      ),
    ).toBeVisible()
    expect(screen.getByLabelText(/Organization name/)).toHaveValue('Institute edited')
    expect(refresh).not.toHaveBeenCalled()
  })
})
