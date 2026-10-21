import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { EditableNewsCard, type EditableNewsCardProps } from './EditableNewsCard'
import { AssistantMode, EditModeOn, LegacyItem, ViewMode } from './EditableNewsCard.stories'

const viewArgs = ViewMode.args as EditableNewsCardProps
const editArgs = EditModeOn.args as EditableNewsCardProps
const assistantArgs = AssistantMode.args as EditableNewsCardProps
const legacyArgs = LegacyItem.args as EditableNewsCardProps
const title = editArgs.article.title
const editName = `Editar ${title}`
const deleteName = `Eliminar ${title}`

/** A field's accessible name also carries its error message, so match on the label's start. */
function field(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

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
    expect(screen.queryByRole('button', { name: editName })).not.toBeInTheDocument()
  })

  test('shows edit and delete actions when edit mode is on with full grants', () => {
    renderWithEditMode(true, editArgs)

    expect(screen.getByRole('button', { name: editName })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: deleteName })).toBeInTheDocument()
  })

  test('shows only the edit action for an account without delete_components', () => {
    renderWithEditMode(true, assistantArgs)

    expect(screen.getByRole('button', { name: editName })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: deleteName })).not.toBeInTheDocument()
  })

  test('renders a plain card when edit mode is on but the account has no grants', () => {
    renderWithEditMode(true, { ...editArgs, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button', { name: editName })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: deleteName })).not.toBeInTheDocument()
  })

  test('opens the article form in a modal when the edit action is pressed', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: editName }))

    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
    expect(field('Título (Español)')).toHaveValue(editArgs.article.title)
    // The card and its actions stay visible behind the modal.
    expect(screen.getByRole('button', { name: editName })).toBeInTheDocument()
  })

  test('closes the modal once onSave reports the edit as saved', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(
      (_initial: unknown, _draft: unknown, _confirmed: unknown, close: () => void) => close(),
    )
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: editName }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ version: editArgs.article.editing!.version }),
      expect.objectContaining({ source: editArgs.article.source }),
      [],
      expect.any(Function),
    )
    expect(await screen.findByRole('heading', { name: editArgs.article.title })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('keeps the modal open with the input when the save does not succeed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: editName }))
    await user.clear(field('Fuente'))
    await user.type(field('Fuente'), 'Fuente editada')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
    expect(field('Fuente')).toHaveValue('Fuente editada')
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: deleteName }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar noticia' })
    expect(dialog).toHaveTextContent(
      `¿Desea eliminar la noticia "${editArgs.article.title}"? Esta acción no se puede deshacer.`,
    )
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('asks before discarding changes when Escape closes the modal', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: editName }))
    await user.type(field('Fuente'), ' editada')
    await user.keyboard('{Escape}')

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
    expect(field('Fuente')).toHaveValue(`${editArgs.article.source} editada`)
  })

  test('tells editors an item has no English version yet', () => {
    renderWithEditMode(true, legacyArgs)

    expect(screen.getByText(/Sin versión en inglés/)).toBeInTheDocument()
  })

  test('shows visitors no translation note', () => {
    renderWithEditMode(false, legacyArgs)

    expect(screen.queryByText(/Sin versión en inglés/)).not.toBeInTheDocument()
  })

  test('disables its actions while a request is in flight', () => {
    renderWithEditMode(true, { ...editArgs, busy: true })

    expect(screen.queryByRole('button', { name: editName })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: deleteName })).not.toBeInTheDocument()
  })
})
