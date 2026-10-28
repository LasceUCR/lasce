import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadAcknowledgmentLogo: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadAcknowledgmentLogo: mocks.uploadAcknowledgmentLogo,
}))

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import {
  RosacAcknowledgmentForm,
  type RosacAcknowledgmentFormProps,
} from './RosacAcknowledgmentForm'
import { AddNew, EditExisting } from './RosacAcknowledgmentForm.stories'

const editArgs = EditExisting.args as RosacAcknowledgmentFormProps
const addArgs = AddNew.args as RosacAcknowledgmentFormProps

/** The form reports a failed upload with a toast, so it renders inside the app's providers. */
function render(ui: ReactElement, options?: Parameters<typeof renderWithIntl>[1]) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, options)
}

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

function renderForm(
  props: RosacAcknowledgmentFormProps,
  options?: Parameters<typeof renderWithIntl>[1],
) {
  return render(<RosacAcknowledgmentForm {...props} />, options)
}

describe('RosacAcknowledgmentForm', () => {
  test('starts pre-filled when editing an existing institution', () => {
    renderForm(editArgs)

    expect(screen.getByRole('textbox', { name: 'Nombre (Español)' })).toHaveValue(
      editArgs.institution!.name,
    )
    expect(
      screen.getByRole('textbox', { name: 'Texto alternativo del logo (Accesibilidad)' }),
    ).toHaveValue(editArgs.institution!.logo.alt)
  })

  test('starts blank when adding a new institution', () => {
    renderForm(addArgs)

    expect(screen.getByRole('textbox', { name: 'Nombre (Español)' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ ...editArgs, onCancel })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ ...addArgs, onCancel })

    const nameInput = screen.getByRole('textbox', { name: 'Nombre (Español)' })
    await user.type(nameInput, 'Instituto Tecnológico')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: '¿Descartar cambios?' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when name is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...addArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El nombre en español es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves institution directly when both languages are updated', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...editArgs, onSave })

    const nameInput = screen.getByRole('textbox', { name: 'Nombre (Español)' })
    await user.clear(nameInput)
    await user.type(nameInput, 'CINESPA Editado')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    const enNameInput = screen.getByRole('textbox', { name: 'Nombre (English)' })
    await user.clear(enNameInput)
    await user.type(enNameInput, 'CINESPA Edited')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1',
        content: {
          es: {
            name: 'CINESPA Editado',
          },
          en: {
            name: 'CINESPA Edited',
          },
        },
        confirmedUnchanged: [],
      }),
    )
  })

  test('asks to review the other language when only one language changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...editArgs, onSave })

    const nameInput = screen.getByRole('textbox', { name: 'Nombre (Español)' })
    await user.clear(nameInput)
    await user.type(nameInput, 'CINESPA Editado')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /^English/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch')).not.toBeChecked()

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1',
        content: {
          es: {
            name: 'CINESPA Editado',
          },
          en: {
            name: editArgs.institution!.editing!.content.en?.name,
          },
        },
        confirmedUnchanged: [{ locale: 'en', field: 'name' }],
      }),
    )
  })

  test('clears name and alt when switching from a preset back to custom logo', async () => {
    const user = userEvent.setup()
    renderForm(addArgs)

    const select = screen.getByRole('combobox', {
      name: 'Escoger un logo personalizado o seleccionar uno de la lista',
    })

    // Select preset 0
    await user.selectOptions(select, '0')
    expect(screen.getByRole('textbox', { name: 'Nombre (Español)' })).not.toHaveValue('')

    // Switch back to custom
    await user.selectOptions(select, 'custom')
    expect(screen.getByRole('textbox', { name: 'Nombre (Español)' })).toHaveValue('')
    expect(
      screen.getByRole('textbox', { name: 'Texto alternativo del logo (Accesibilidad)' }),
    ).toHaveValue('')
  })

  test('shows the error in a toast and does not save when the logo upload fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadAcknowledgmentLogo.mockResolvedValue({
      ok: false,
      error: 'El logo es demasiado grande.',
    })
    renderForm({ ...addArgs, onSave })

    await user.type(
      screen.getByRole('textbox', { name: 'Nombre (Español)' }),
      'Instituto Tecnológico',
    )
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.type(
      screen.getByRole('textbox', { name: 'Nombre (English)' }),
      'Technological Institute',
    )
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['logo'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('El logo es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    // A toast, not a custom message inside the form.
    expect(document.querySelector('.cms-form .form-alert')).toBeNull()
  })

  test('shows a toast when the logo upload throws', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadAcknowledgmentLogo.mockRejectedValue(new Error('network error'))
    renderForm({ ...addArgs, onSave })

    await user.type(
      screen.getByRole('textbox', { name: 'Nombre (Español)' }),
      'Instituto Tecnológico',
    )
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.type(
      screen.getByRole('textbox', { name: 'Nombre (English)' }),
      'Technological Institute',
    )
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['logo'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir el logo. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('fills alt text with English preset defaultAltEn when in English locale', async () => {
    const user = userEvent.setup()
    render(<RosacAcknowledgmentForm {...addArgs} />, { locale: 'en' })

    const select = screen.getByRole('combobox', {
      name: 'Choose a custom logo or select one from the list',
    })

    // Select preset 0
    await user.selectOptions(select, '0')
    expect(
      screen.getByRole('textbox', { name: 'Logo alternative text (Accessibility)' }),
    ).toHaveValue('Logo of the Vice-Rectorate for Research, University of Costa Rica')
  })
})
