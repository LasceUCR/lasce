import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

vi.mock('@/app/(public)/noticias/actions', () => ({
  uploadNewsImage: vi.fn(),
}))

import { EditableNewsCard, type EditableNewsCardProps } from './EditableNewsCard'
import { AssistantMode, EditModeOn, ViewMode } from './EditableNewsCard.stories'

const viewArgs = ViewMode.args as EditableNewsCardProps
const editArgs = EditModeOn.args as EditableNewsCardProps
const assistantArgs = AssistantMode.args as EditableNewsCardProps

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

  test('shows edit and delete actions when edit mode is on with full grants', () => {
    renderWithEditMode(true, editArgs)

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  test('shows only the edit action for an account without delete_components', () => {
    renderWithEditMode(true, assistantArgs)

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  test('renders a plain card when edit mode is on but the account has no grants', () => {
    renderWithEditMode(true, { ...editArgs, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
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

  test('saves and closes the modal when the form save succeeds', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(null)
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { name: editArgs.article.title })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows the error and keeps the modal open when the form save fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue('No se pudo guardar el cambio. Inténtelo de nuevo.')
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo guardar el cambio. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
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
