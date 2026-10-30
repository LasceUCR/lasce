import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import {
  RosacCharacteristicForm,
  type RosacCharacteristicFormProps,
} from './RosacCharacteristicForm'
import { Default } from './RosacCharacteristicForm.stories'

const defaultArgs = Default.args as RosacCharacteristicFormProps

function renderForm(props: Partial<RosacCharacteristicFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  renderWithIntl(
    <RosacCharacteristicForm {...defaultArgs} onCancel={onCancel} onSave={onSave} {...props} />,
    { locale },
  )
  return { onSave, onCancel, user: userEvent.setup() }
}

describe('RosacCharacteristicForm', () => {
  test('starts pre-filled with the characteristic being edited', () => {
    renderForm()

    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('antenna')
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue(
      defaultArgs.characteristic.title,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveValue(
      defaultArgs.characteristic.description,
    )
  })

  test('calls onCancel directly when untouched', async () => {
    const { onCancel, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const { onCancel, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Nuevo Título')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: '¿Descartar cambios?' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when fields are empty on submit', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves changes directly on submit when both languages are updated', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Antena Modificada')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    const enTitleInput = screen.getByRole('textbox', { name: 'Título (English)' })
    await user.clear(enTitleInput)
    await user.type(enTitleInput, 'Modified Antenna')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      version: '1',
      content: {
        es: {
          title: 'Antena Modificada',
          description: defaultArgs.characteristic.description,
        },
        en: {
          title: 'Modified Antenna',
          description: defaultArgs.characteristic.editing?.content.en?.description ?? '',
        },
      },
      confirmedUnchanged: [],
    })
  })

  test('asks to review the other language when only one language changed', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Antena Modificada')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /^English/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch')).not.toBeChecked()

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      version: '1',
      content: {
        es: {
          title: 'Antena Modificada',
          description: defaultArgs.characteristic.description,
        },
        en: {
          title: defaultArgs.characteristic.editing?.content.en?.title ?? '',
          description: defaultArgs.characteristic.editing?.content.en?.description ?? '',
        },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })
})
