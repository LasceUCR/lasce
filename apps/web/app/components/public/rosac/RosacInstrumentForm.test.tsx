import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadInstrumentImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadInstrumentImage: mocks.uploadInstrumentImage,
}))

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { RosacInstrumentForm, type RosacInstrumentFormProps } from './RosacInstrumentForm'
import { AddNew, EditExisting } from './RosacInstrumentForm.stories'

const editArgs = EditExisting.args as RosacInstrumentFormProps
const addArgs = AddNew.args as RosacInstrumentFormProps

/** The form reports a failed upload with a toast, so it renders inside the app's providers. */
function render(ui: ReactElement, options?: Parameters<typeof renderWithIntl>[1]) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, options)
}

// jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

function renderForm(props: RosacInstrumentFormProps, options?: Parameters<typeof renderWithIntl>[1]) {
  return render(<RosacInstrumentForm {...props} />, options)
}

describe('RosacInstrumentForm', () => {
  test('starts pre-filled when editing an existing instrument', () => {
    renderForm(editArgs)

    expect(screen.getByRole('textbox', { name: 'Nombre (Español)' })).toHaveValue(
      editArgs.instrument!.name,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveValue(
      editArgs.instrument!.editing!.content.es.description,
    )
    expect(screen.getByRole('textbox', { name: 'Etiqueta del botón' })).toHaveValue(
      editArgs.instrument!.consultation!.label,
    )
  })

  test('starts blank when adding a new instrument', () => {
    renderForm(addArgs)

    expect(screen.getByRole('textbox', { name: 'Nombre (Español)' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ ...editArgs, onCancel })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ ...addArgs, onCancel })

    const nameInput = screen.getByRole('textbox', { name: 'Nombre (Español)' })
    await user.type(nameInput, 'Radiómetro')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: '¿Descartar cambios?' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...addArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El nombre en español es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La descripción en español es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La imagen es obligatoria.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('calls onSave directly without save confirmation dialog when saving an instrument', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...editArgs, onSave })

    const nameInput = screen.getByRole('textbox', { name: 'Nombre (Español)' })
    await user.clear(nameInput)
    await user.type(nameInput, 'Espectrómetro Solar')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    const enNameInput = screen.getByRole('textbox', { name: 'Nombre (English)' })
    await user.clear(enNameInput)
    await user.type(enNameInput, 'Solar Spectrometer')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1',
        content: {
          es: {
            name: 'Espectrómetro Solar',
            description: 'Resultados simulados.',
          },
          en: {
            name: 'Solar Spectrometer',
            description: 'Simulated results.',
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
    await user.type(nameInput, 'Espectrómetro Solar')

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
            name: 'Espectrómetro Solar',
            description: 'Resultados simulados.',
          },
          en: {
            name: editArgs.instrument!.editing!.content.en?.name,
            description: editArgs.instrument!.editing!.content.en?.description,
          },
        },
        confirmedUnchanged: [{ locale: 'en', field: 'name' }],
      }),
    )
  })

  test('configures simulation consultation mode with target selector', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...editArgs, onSave })

    const modeSelect = screen.getByRole('combobox', { name: 'Tipo de acción' })
    await user.selectOptions(modeSelect, 'simulation')

    const targetSelect = screen.getByRole('combobox', {
      name: 'Instrumento de simulación asociado',
    })
    await user.selectOptions(targetSelect, 'ROSAC-I2')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        consultation: expect.objectContaining({
          href: '/datos?source=ROSAC&instrument=ROSAC-I2#scientific-query-title',
        }),
      }),
    )
  })

  test('configures disabled consultation mode without href', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...editArgs, onSave })

    const modeSelect = screen.getByRole('combobox', { name: 'Tipo de acción' })
    await user.selectOptions(modeSelect, 'disabled')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        consultation: expect.objectContaining({
          href: undefined,
        }),
      }),
    )
  })

  test('validates custom url field when custom mode is selected', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ ...editArgs, onSave })

    const modeSelect = screen.getByRole('combobox', { name: 'Tipo de acción' })
    await user.selectOptions(modeSelect, 'custom')

    const urlInput = screen.getByRole('textbox', { name: 'Enlace de consulta (URL)' })
    await user.clear(urlInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      screen.getByText('El enlace es obligatorio para un destino personalizado.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('shows the error in a toast and does not save when the image upload fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadInstrumentImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })
    renderForm({ ...editArgs, onSave })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    // A toast, not a custom message inside the form.
    expect(document.querySelector('.cms-form .form-alert')).toBeNull()
  })

  test('shows a toast when the image upload throws', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadInstrumentImage.mockRejectedValue(new Error('network error'))
    renderForm({ ...editArgs, onSave })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('localizes simulation target options in both Spanish and English', () => {
    const { unmount } = render(<RosacInstrumentForm {...editArgs} />)

    expect(
      screen.getByRole('option', {
        name: 'Instrumento 1 - Serie temporal de prueba (ROSAC-I1)',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', {
        name: 'Instrumento 2 - Espectro dinámico de prueba (ROSAC-I2)',
      }),
    ).toBeInTheDocument()

    unmount()

    render(<RosacInstrumentForm {...editArgs} />, { locale: 'en' })

    expect(
      screen.getByRole('option', {
        name: 'Instrument 1 - Test time series (ROSAC-I1)',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', {
        name: 'Instrument 2 - Test dynamic spectrum (ROSAC-I2)',
      }),
    ).toBeInTheDocument()
  })
})
