import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { EditableNewsCard, type EditableNewsCardProps } from './EditableNewsCard'
import { AssistantMode, EditModeOn, ViewMode } from './EditableNewsCard.stories'

const viewArgs = ViewMode.args as EditableNewsCardProps
const editArgs = EditModeOn.args as EditableNewsCardProps
const assistantArgs = AssistantMode.args as EditableNewsCardProps

function renderWithEditMode(editMode: boolean, props: EditableNewsCardProps) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <EditableNewsCard {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
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

  test('closes the modal once onSave reports the edit as saved', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn((_values: unknown, close: () => void) => close())
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: editArgs.article.title }),
      expect.any(Function),
    )
    expect(await screen.findByRole('heading', { name: editArgs.article.title })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('keeps the modal open with the input when the save does not succeed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Título editado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('Título editado')
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar noticia' })
    expect(dialog).toHaveTextContent(
      `¿Desea eliminar la noticia "${editArgs.article.title}"? Esta acción no se puede deshacer.`,
    )
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
