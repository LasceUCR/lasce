import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditableWrapper, type EditableWrapperProps } from './EditableWrapper'
import { Default, EditOnly } from './EditableWrapper.stories'

const defaultArgs = Default.args as EditableWrapperProps

describe('EditableWrapper', () => {
  test('renders its children alongside edit and delete actions', () => {
    render(<EditableWrapper {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: 'Bienvenidos al laboratorio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('icon-button-danger')
  })

  test('calls onEdit directly when the edit action is pressed', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<EditableWrapper {...defaultArgs} onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test('asks for confirmation before calling onDelete', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<EditableWrapper {...defaultArgs} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('button-danger')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('does not call onDelete when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<EditableWrapper {...defaultArgs} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('hides the delete action when onDelete is omitted', () => {
    render(<EditableWrapper {...(EditOnly.args as EditableWrapperProps)} />)

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  test('uses the card title in the action names when they are provided', () => {
    render(
      <EditableWrapper
        {...defaultArgs}
        deleteLabel="Eliminar Fenómenos solares eruptivos"
        editLabel="Editar Fenómenos solares eruptivos"
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Editar Fenómenos solares eruptivos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Eliminar Fenómenos solares eruptivos' }),
    ).toBeInTheDocument()
  })
})
