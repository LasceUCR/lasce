import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadResearcherImage: vi.fn(),
}))

import { EditableResearcherCard, type EditableResearcherCardProps } from './EditableResearcherCard'
import { AssistantMode, EditModeOn, ViewMode } from './EditableResearcherCard.stories'

const viewArgs = ViewMode.args as EditableResearcherCardProps
const editArgs = EditModeOn.args as EditableResearcherCardProps
const assistantArgs = AssistantMode.args as EditableResearcherCardProps

function renderWithEditMode(editMode: boolean, props: EditableResearcherCardProps) {
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
      <EditableResearcherCard {...props} />
    </EditModeContext.Provider>,
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
    const onSave = vi.fn().mockResolvedValue(null)
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByRole('heading', { name: editArgs.researcher.name }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows the error and keeps the modal open when the form save fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue('No se pudo guardar el cambio. Inténtelo de nuevo.')
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: `Editar a ${editArgs.researcher.name}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo guardar el cambio. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar investigador' })).toBeInTheDocument()
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: `Eliminar a ${editArgs.researcher.name}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
