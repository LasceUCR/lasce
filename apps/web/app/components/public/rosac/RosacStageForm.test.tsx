import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { RosacStageForm, type RosacStageFormProps } from './RosacStageForm'
import { Default } from './RosacStageForm.stories'

const defaultArgs = Default.args as RosacStageFormProps

describe('RosacStageForm', () => {
  test('starts pre-filled with the stage being edited', () => {
    render(<RosacStageForm {...defaultArgs} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(defaultArgs.stage.title)
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      defaultArgs.stage.description,
    )
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacStageForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacStageForm {...defaultArgs} onCancel={onCancel} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Título Modificado')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when fields are empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves changes directly without save confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Etapa Modificada')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      title: 'Etapa Modificada',
      description: defaultArgs.stage.description,
    })
  })
})
