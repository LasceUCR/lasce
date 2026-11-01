import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { RosacActivityForm, type RosacActivityFormProps } from './RosacActivityForm'
import { EditExisting } from './RosacActivityForm.stories'

const editArgs = EditExisting.args as RosacActivityFormProps

function renderForm(props: Partial<RosacActivityFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  renderWithIntl(
    <RosacActivityForm {...editArgs} onCancel={onCancel} onSave={onSave} {...props} />,
    { locale },
  )
  return { onSave, onCancel, user: userEvent.setup() }
}

describe('RosacActivityForm', () => {
  test('starts pre-filled when editing an existing activity', () => {
    renderForm()

    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('tracking')
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue(
      editArgs.activity.title,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveValue(
      editArgs.activity.description,
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
    await user.type(titleInput, 'Actividad Nueva')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: '¿Descartar cambios?' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when title is cleared on submit', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('calls onSave directly when submitted with both languages updated', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Nueva Actividad')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    const enTitleInput = screen.getByRole('textbox', { name: 'Título (English)' })
    await user.clear(enTitleInput)
    await user.type(enTitleInput, 'New Activity')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      version: '1',
      content: {
        es: {
          title: 'Nueva Actividad',
          description: editArgs.activity.description,
        },
        en: {
          title: 'New Activity',
          description: editArgs.activity.editing?.content.en?.description ?? '',
        },
      },
      confirmedUnchanged: [],
    })
  })

  test('asks to review the other language when only one language changed', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Nueva Actividad')

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
          title: 'Nueva Actividad',
          description: editArgs.activity.description,
        },
        en: {
          title: editArgs.activity.editing?.content.en?.title ?? '',
          description: editArgs.activity.editing?.content.en?.description ?? '',
        },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })
})
