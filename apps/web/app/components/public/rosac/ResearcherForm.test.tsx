import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ResearcherForm, type ResearcherFormProps } from './ResearcherForm'
import { Default } from './ResearcherForm.stories'

const defaultArgs = Default.args as ResearcherFormProps

describe('ResearcherForm', () => {
  test('starts pre-filled with the researcher being edited', () => {
    render(<ResearcherForm {...defaultArgs} />)

    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue(defaultArgs.researcher.role)
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue(defaultArgs.researcher.name)
    expect(screen.getByRole('textbox', { name: 'Institución' })).toHaveValue(
      defaultArgs.researcher.institution,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      defaultArgs.researcher.description,
    )
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('disables saving when a required field is cleared', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...defaultArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('disables saving once the existing photo is removed', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('asks for confirmation before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  test('saves the edited values once the confirmation is accepted', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...defaultArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Rol' }))
    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador asociado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      role: 'Investigador asociado',
      name: defaultArgs.researcher.name,
      institution: defaultArgs.researcher.institution,
      description: defaultArgs.researcher.description,
      photoFile: null,
      photoRemoved: false,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('does not save when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
