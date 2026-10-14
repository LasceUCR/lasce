import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadAcknowledgmentLogo: vi.fn(),
}))

import {
  EditableAcknowledgmentCard,
  type EditableAcknowledgmentCardProps,
} from './EditableAcknowledgmentCard'
import { AssistantMode, EditModeOn, ViewMode } from './EditableAcknowledgmentCard.stories'

const viewArgs = ViewMode.args as EditableAcknowledgmentCardProps
const editArgs = EditModeOn.args as EditableAcknowledgmentCardProps
const assistantArgs = AssistantMode.args as EditableAcknowledgmentCardProps

function renderWithEditMode(editMode: boolean, props: EditableAcknowledgmentCardProps) {
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
      <EditableAcknowledgmentCard {...props} />
    </EditModeContext.Provider>,
  )
}

describe('EditableAcknowledgmentCard', () => {
  test('renders a plain card with no edit affordances when edit mode is off', () => {
    renderWithEditMode(false, viewArgs)

    expect(screen.getByText(viewArgs.institution.name)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
  })

  test('shows edit and delete actions when edit mode is on with full grants', () => {
    renderWithEditMode(true, editArgs)

    expect(
      screen.getByRole('button', { name: `Editar ${editArgs.institution.name}` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Eliminar ${editArgs.institution.name}` }),
    ).toBeInTheDocument()
  })

  test('shows only the edit action for an account without delete_components', () => {
    renderWithEditMode(true, assistantArgs)

    expect(
      screen.getByRole('button', { name: `Editar ${assistantArgs.institution.name}` }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `Eliminar ${assistantArgs.institution.name}` }),
    ).not.toBeInTheDocument()
  })

  test('opens the acknowledgment form in a modal when the edit action is clicked', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: `Editar ${editArgs.institution.name}` }))

    expect(screen.getByRole('dialog', { name: 'Editar institución' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).toHaveValue(
      editArgs.institution.name,
    )
  })

  test('saves and closes the modal when the form save succeeds', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(null)
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: `Editar ${editArgs.institution.name}` }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: `Eliminar ${editArgs.institution.name}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
