import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadResearcherImage: vi.fn(),
}))

import { EditableResearcherCard, type EditableResearcherCardProps } from './EditableResearcherCard'
import { AssistantMode, EditModeOn, ViewMode } from './EditableResearcherCard.stories'

const viewArgs = ViewMode.args as EditableResearcherCardProps
const editArgs = EditModeOn.args as EditableResearcherCardProps
const assistantArgs = AssistantMode.args as EditableResearcherCardProps

function renderWithEditMode(editMode: boolean, props: EditableResearcherCardProps) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <EditableResearcherCard {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

describe('EditableResearcherCard', () => {
  test('renders a plain card with no edit affordances when edit mode is off', () => {
    renderWithEditMode(false, viewArgs)

    expect(screen.getByRole('heading', { name: viewArgs.researcher.name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
  })

  test('shows edit and delete actions when edit mode is on with full grants', () => {
    renderWithEditMode(true, editArgs)

    expect(
      screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Eliminar a ${editArgs.researcher.name}` }),
    ).toBeInTheDocument()
  })

  test('shows only the edit action for an account without delete_components', () => {
    renderWithEditMode(true, assistantArgs)

    expect(
      screen.getByRole('button', { name: `Editar a ${assistantArgs.researcher.name}` }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `Eliminar a ${assistantArgs.researcher.name}` }),
    ).not.toBeInTheDocument()
  })

  test('renders a plain card when edit mode is on but the account has no grants', () => {
    renderWithEditMode(true, { ...editArgs, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar/ })).not.toBeInTheDocument()
  })

  test('opens the researcher form in a modal when the edit action is pressed', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }))

    expect(screen.getByRole('dialog', { name: 'Editar investigador' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue(editArgs.researcher.role)
    // The card and its actions stay visible behind the modal.
    expect(
      screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }),
    ).toBeInTheDocument()
  })

  test('saves and closes the modal when the form save succeeds', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(true)
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByRole('heading', { name: editArgs.researcher.name }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('keeps the modal open with the input when the save fails', async () => {
    const user = userEvent.setup()
    // The page reports the failure in a toast; the card only has to keep the form open.
    const failedSave = Promise.resolve(false)
    const onSave = vi.fn(() => failedSave)
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }))
    await user.clear(screen.getByRole('textbox', { name: 'Rol' }))
    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador asociado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await act(async () => {
      await failedSave
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Editar investigador' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue('Investigador asociado')
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: `Eliminar a ${editArgs.researcher.name}` }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar investigador' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
