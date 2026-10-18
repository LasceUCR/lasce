import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl as render } from '@/app/lib/i18n/testing'

const mocks = vi.hoisted(() => ({
  uploadInstrumentImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadInstrumentImage: mocks.uploadInstrumentImage,
}))

import { RosacInstrumentForm, type RosacInstrumentFormProps } from './RosacInstrumentForm'
import { AddNew, EditExisting } from './RosacInstrumentForm.stories'

const editArgs = EditExisting.args as RosacInstrumentFormProps
const addArgs = AddNew.args as RosacInstrumentFormProps

// jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('RosacInstrumentForm', () => {
  test('starts pre-filled when editing an existing instrument', () => {
    render(<RosacInstrumentForm {...editArgs} />)

    expect(screen.getByRole('textbox', { name: 'Nombre del instrumento' })).toHaveValue(
      editArgs.instrument!.name,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      editArgs.instrument!.consultation!.notice,
    )
    expect(screen.getByRole('textbox', { name: 'Etiqueta del botón' })).toHaveValue(
      editArgs.instrument!.consultation!.label,
    )
  })

  test('starts blank when adding a new instrument', () => {
    render(<RosacInstrumentForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Nombre del instrumento' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacInstrumentForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacInstrumentForm {...addArgs} onCancel={onCancel} />)

    const nameInput = screen.getByRole('textbox', { name: 'Nombre del instrumento' })
    await user.type(nameInput, 'Radiómetro')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacInstrumentForm {...addArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La descripción es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La imagen es obligatoria.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('calls onSave directly without save confirmation dialog when saving an instrument', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacInstrumentForm {...editArgs} onSave={onSave} />)

    const nameInput = screen.getByRole('textbox', { name: 'Nombre del instrumento' })
    await user.clear(nameInput)
    await user.type(nameInput, 'Espectrómetro Solar')

    const descInput = screen.getByRole('textbox', { name: 'Descripción' })
    await user.clear(descInput)
    await user.type(descInput, 'Espectros de radio de alta resolución.')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Espectrómetro Solar',
        image: expect.objectContaining({
          src: editArgs.instrument!.image!.src,
        }),
        consultation: expect.objectContaining({
          notice: 'Espectros de radio de alta resolución.',
        }),
      }),
    )
  })

  test('configures simulation consultation mode with target selector', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacInstrumentForm {...editArgs} onSave={onSave} />)

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
    render(<RosacInstrumentForm {...editArgs} onSave={onSave} />)

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
    render(<RosacInstrumentForm {...editArgs} onSave={onSave} />)

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
