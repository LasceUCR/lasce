import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/app/(public)/actividades-academicas/actions', () => ({
  uploadAcademicActivityImage: vi.fn(),
}))

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  EditableAcademicActivityCard,
  type EditableAcademicActivityCardProps,
} from './EditableAcademicActivityCard'
import {
  AssistantMode,
  EditModeOn,
  LegacyActivity,
  ViewMode,
} from './EditableAcademicActivityCard.stories'

const viewArgs = ViewMode.args as EditableAcademicActivityCardProps
const editArgs = EditModeOn.args as EditableAcademicActivityCardProps
const assistantArgs = AssistantMode.args as EditableAcademicActivityCardProps
const legacyArgs = LegacyActivity.args as EditableAcademicActivityCardProps

/** A field's accessible name also carries its error message, so match on the label's start. */
function field(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

function renderWithEditMode(editMode: boolean, props: EditableAcademicActivityCardProps) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <EditableAcademicActivityCard {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

describe('EditableAcademicActivityCard', () => {
  test('renders a plain card with no edit affordances when edit mode is off', () => {
    renderWithEditMode(false, viewArgs)

    expect(screen.getByRole('heading', { name: viewArgs.activity.title })).toBeInTheDocument()
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

  test('opens the activity form in a modal when the edit action is pressed', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('dialog', { name: 'Editar actividad académica' })).toBeInTheDocument()
    expect(field('Título (Español)')).toHaveValue(editArgs.activity.title)
    // The card and its actions stay visible behind the modal.
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  test('closes the modal once onSave reports the edit as saved', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(
      (
        _initial: unknown,
        _draft: unknown,
        _confirmed: unknown,
        _newPhotoUrl: unknown,
        close: () => void,
      ) => close(),
    )
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ version: editArgs.activity.editing!.version }),
      expect.objectContaining({ location: editArgs.activity.location }),
      [],
      null,
      expect.any(Function),
    )
    expect(
      await screen.findByRole('heading', { name: editArgs.activity.title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('keeps the modal open with the input when the save does not succeed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithEditMode(true, { ...editArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByRole('textbox', { name: 'Ubicación' }))
    await user.type(screen.getByRole('textbox', { name: 'Ubicación' }), 'Ubicación editada')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Editar actividad académica' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Ubicación' })).toHaveValue('Ubicación editada')
  })

  test('confirms and calls onDelete when the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithEditMode(true, { ...editArgs, onDelete })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar actividad académica' })
    expect(dialog).toHaveTextContent(
      'Esta acción no se puede deshacer y borrará la actividad del catálogo público.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('asks before discarding changes when Escape closes the modal', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, editArgs)

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.type(screen.getByRole('textbox', { name: 'Ubicación' }), ' editada')
    await user.keyboard('{Escape}')

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('dialog', { name: 'Editar actividad académica' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Ubicación' })).toHaveValue(
      `${editArgs.activity.location} editada`,
    )
  })

  test('flags the missing English version inside the legacy activity form', async () => {
    const user = userEvent.setup()
    renderWithEditMode(true, legacyArgs)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
  })

  test('disables its actions while a request is in flight', () => {
    renderWithEditMode(true, { ...editArgs, busy: true })

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })
})
