import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl as render } from '@/app/lib/i18n/testing'

const mocks = vi.hoisted(() => ({
  uploadAcknowledgmentLogo: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadAcknowledgmentLogo: mocks.uploadAcknowledgmentLogo,
}))

import {
  RosacAcknowledgmentForm,
  type RosacAcknowledgmentFormProps,
} from './RosacAcknowledgmentForm'
import { AddNew, EditExisting } from './RosacAcknowledgmentForm.stories'

const editArgs = EditExisting.args as RosacAcknowledgmentFormProps
const addArgs = AddNew.args as RosacAcknowledgmentFormProps

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
