import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { EditableNewsCard, type EditableNewsCardProps } from './EditableNewsCard'
import { EditModeOn, ViewMode } from './EditableNewsCard.stories'

const viewArgs = ViewMode.args as EditableNewsCardProps
const editArgs = EditModeOn.args as EditableNewsCardProps

function renderWithEditMode(editMode: boolean, props: EditableNewsCardProps) {
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
      <EditableNewsCard {...props} />
    </EditModeContext.Provider>,
  )
}

describe('EditableNewsCard', () => {
  test('renders a plain card with no edit affordances when edit mode is off', () => {
    renderWithEditMode(false, viewArgs)

    expect(screen.getByRole('heading', { name: viewArgs.article.title })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  test('shows edit and delete actions when edit mode is on', () => {
    renderWithEditMode(true, editArgs)

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  test('opens the article form in a modal when the edit action is pressed', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(editArgs.article.title)
    // The card and its actions stay visible behind the modal.
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  test('saves and closes the modal when the form is saved', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
