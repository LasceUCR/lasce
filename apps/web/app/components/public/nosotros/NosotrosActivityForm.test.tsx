import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { NosotrosActivityForm, type NosotrosActivityFormProps } from './NosotrosActivityForm'
import { Create, Default } from './NosotrosActivityForm.stories'

const defaultArgs = Default.args as NosotrosActivityFormProps
const createArgs = Create.args as NosotrosActivityFormProps

describe('NosotrosActivityForm', () => {
  test('starts pre-filled with the activity being edited', () => {
    render(<NosotrosActivityForm {...defaultArgs} />)

    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('sun')
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(defaultArgs.activity.title)
    expect(screen.getByRole('textbox', { name: 'Texto' })).toHaveValue(
      defaultArgs.activity.description,
    )
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows a field error and does not confirm when the title is cleared', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('shows a field error for each empty field when creating an activity', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NosotrosActivityForm {...createArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El texto es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('asks for confirmation before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  test('saves the edited values once the confirmation is accepted', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nuevo título')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ícono' }), 'waves')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      icon: 'waves',
      title: 'Nuevo título',
      description: defaultArgs.activity.description,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('does not save when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('saves straight away, without a confirmation dialog, when confirmation is not required', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NosotrosActivityForm {...createArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Actividad nueva')
    await user.type(screen.getByRole('textbox', { name: 'Texto' }), 'Texto de prueba')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      icon: 'sun',
      title: 'Actividad nueva',
      description: 'Texto de prueba',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('asks before discarding unsaved changes and closes once confirmed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('keeps the form open when discard is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).not.toBeInTheDocument()
  })
})
