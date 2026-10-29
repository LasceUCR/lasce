import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl as render } from '@/app/lib/i18n/testing'

import {
  RosacCharacteristicForm,
  type RosacCharacteristicFormProps,
} from './RosacCharacteristicForm'
import { Default } from './RosacCharacteristicForm.stories'

const defaultArgs = Default.args as RosacCharacteristicFormProps

describe('RosacCharacteristicForm', () => {
  test('starts pre-filled with the characteristic being edited', () => {
    render(<RosacCharacteristicForm {...defaultArgs} />)

    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('antenna')
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(
      defaultArgs.characteristic.title,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      defaultArgs.characteristic.description,
    )
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacCharacteristicForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacCharacteristicForm {...defaultArgs} onCancel={onCancel} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Nuevo Título')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when fields are empty on submit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacCharacteristicForm {...defaultArgs} onSave={onSave} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves changes directly on submit without save confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacCharacteristicForm {...defaultArgs} onSave={onSave} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Antena Modificada')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      icon: 'antenna',
      title: 'Antena Modificada',
      description: defaultArgs.characteristic.description,
    })
  })
})
