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
function render(ui: ReactElement) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>)
}

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('RosacAcknowledgmentForm', () => {
  test('starts pre-filled when editing an existing institution', () => {
    render(<RosacAcknowledgmentForm {...editArgs} />)

    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).toHaveValue(
      editArgs.institution!.name,
    )
    expect(
      screen.getByRole('textbox', { name: 'Texto alternativo del logo (Accesibilidad)' }),
    ).toHaveValue(editArgs.institution!.logo.alt)
  })

  test('starts blank when adding a new institution', () => {
    render(<RosacAcknowledgmentForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Agregar institución' })).toBeEnabled()
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacAcknowledgmentForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacAcknowledgmentForm {...addArgs} onCancel={onCancel} />)

    const nameInput = screen.getByRole('textbox', { name: 'Nombre de la institución' })
    await user.type(nameInput, 'Instituto Tecnológico')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when name is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacAcknowledgmentForm {...addArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Agregar institución' }))

    expect(screen.getByText('El nombre de la institución es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves institution directly without extra confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacAcknowledgmentForm {...editArgs} onSave={onSave} />)

    const nameInput = screen.getByRole('textbox', { name: 'Nombre de la institución' })
    await user.clear(nameInput)
    await user.type(nameInput, 'CINESPA Editado')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CINESPA Editado',
        logo: expect.objectContaining({
          src: editArgs.institution!.logo.src,
        }),
      }),
    )
  })

  test('clears name and alt when switching from a preset back to custom logo', async () => {
    const user = userEvent.setup()
    render(<RosacAcknowledgmentForm {...addArgs} />)

    const select = screen.getByRole('combobox', {
      name: 'Escoger un logo personalizado o seleccionar uno de la lista',
    })

    // Select preset 0
    await user.selectOptions(select, '0')
    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).not.toHaveValue('')

    // Switch back to custom
    await user.selectOptions(select, 'custom')
    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).toHaveValue('')
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
    render(<RosacAcknowledgmentForm {...addArgs} onSave={onSave} />)

    await user.type(
      screen.getByRole('textbox', { name: 'Nombre de la institución' }),
      'Instituto Tecnológico',
    )
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['logo'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Agregar institución' }))

    expect(await screen.findByText('El logo es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    // A toast, not a custom message inside the form.
    expect(document.querySelector('.cms-form .form-alert')).toBeNull()
  })

  test('shows a toast when the logo upload throws', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadAcknowledgmentLogo.mockRejectedValue(new Error('network error'))
    render(<RosacAcknowledgmentForm {...addArgs} onSave={onSave} />)

    await user.type(
      screen.getByRole('textbox', { name: 'Nombre de la institución' }),
      'Instituto Tecnológico',
    )
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['logo'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Agregar institución' }))

    expect(
      await screen.findByText('No se pudo subir el logo. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
