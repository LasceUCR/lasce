import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

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
      screen.getByRole('textbox', { name: 'Sitio web de la institución (opcional)' }),
    ).toHaveValue(editArgs.institution!.href)
    expect(
      screen.getByRole('textbox', { name: 'Texto alternativo del logo (Accesibilidad)' }),
    ).toHaveValue(editArgs.institution!.logo.alt)
  })

  test('starts blank when adding a new institution', () => {
    render(<RosacAcknowledgmentForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).toHaveValue('')
    expect(
      screen.getByRole('textbox', { name: 'Sitio web de la institución (opcional)' }),
    ).toHaveValue('')
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

  test('validates url format when href is provided', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacAcknowledgmentForm {...editArgs} onSave={onSave} />)

    const hrefInput = screen.getByRole('textbox', {
      name: 'Sitio web de la institución (opcional)',
    })
    await user.clear(hrefInput)
    await user.type(hrefInput, 'enlace-invalido')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      screen.getByText('El enlace debe ser una URL válida que empiece con http:// o https://.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    await user.clear(hrefInput)
    await user.type(hrefInput, 'https://cinespa.ucr.ac.cr/nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://cinespa.ucr.ac.cr/nuevo',
      }),
    )
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
        href: editArgs.institution!.href,
        logo: expect.objectContaining({
          src: editArgs.institution!.logo.src,
        }),
      }),
    )
  })

  test('clears name, alt and href when switching from a preset back to custom logo', async () => {
    const user = userEvent.setup()
    render(<RosacAcknowledgmentForm {...addArgs} />)

    const select = screen.getByRole('combobox', {
      name: 'Escoger un logo personalizado o seleccionar uno de la lista',
    })

    // Select preset 0
    await user.selectOptions(select, '0')
    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).not.toHaveValue('')
    expect(
      screen.getByRole('textbox', { name: 'Sitio web de la institución (opcional)' }),
    ).toHaveValue('https://vinv.ucr.ac.cr')

    // Switch back to custom
    await user.selectOptions(select, 'custom')
    expect(screen.getByRole('textbox', { name: 'Nombre de la institución' })).toHaveValue('')
    expect(
      screen.getByRole('textbox', { name: 'Sitio web de la institución (opcional)' }),
    ).toHaveValue('')
    expect(
      screen.getByRole('textbox', { name: 'Texto alternativo del logo (Accesibilidad)' }),
    ).toHaveValue('')
  })
})
