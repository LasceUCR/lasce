import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl as render } from '@/app/lib/i18n/testing'

import { RosacActivityForm, type RosacActivityFormProps } from './RosacActivityForm'
import { AddNew, EditExisting } from './RosacActivityForm.stories'

const editArgs = EditExisting.args as RosacActivityFormProps
const addArgs = AddNew.args as RosacActivityFormProps

describe('RosacActivityForm', () => {
  test('starts pre-filled when editing an existing activity', () => {
    render(<RosacActivityForm {...editArgs} />)

    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('tracking')
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(editArgs.activity!.title)
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      editArgs.activity!.description,
    )
  })

  test('starts blank when adding a new activity', () => {
    render(<RosacActivityForm {...addArgs} />)

    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('tracking')
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue('')
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacActivityForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacActivityForm {...addArgs} onCancel={onCancel} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.type(titleInput, 'Actividad Nueva')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when title or description is missing', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacActivityForm {...addArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La descripción es obligatoria.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('calls onSave directly without save confirmation dialog when adding a new activity', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacActivityForm {...addArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nueva Actividad')
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Detalle de actividad.')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      icon: 'tracking',
      title: 'Nueva Actividad',
      description: 'Detalle de actividad.',
    })
  })
})
