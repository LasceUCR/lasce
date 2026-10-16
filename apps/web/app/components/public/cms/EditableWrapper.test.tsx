import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditableWrapper, type EditableWrapperProps } from './EditableWrapper'
import { Default, DragWithoutPositionField, Draggable, EditOnly } from './EditableWrapper.stories'

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

  test('labels the delete confirmation in the language it is given', async () => {
    const user = userEvent.setup()
    render(
      <EditableWrapper
        {...defaultArgs}
        deleteCancelLabel="Cancel"
        deleteConfirmLabel="Confirm"
        deleteConfirmMessage="This cannot be undone."
        deleteConfirmTitle="Delete item"
        deleteLabel="Delete"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete item' })

    expect(dialog).toHaveTextContent('This cannot be undone.')
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})

describe('EditableWrapper: drag', () => {
  const draggableArgs = Draggable.args as EditableWrapperProps
  const withoutPositionArgs = DragWithoutPositionField.args as EditableWrapperProps

  function renderSortable(props: EditableWrapperProps) {
    return render(
      <DndContext>
        <SortableContext items={['bienvenida']}>
          <EditableWrapper {...props} />
        </SortableContext>
      </DndContext>,
    )
  }

  test('offers no drag handle unless drag is set', () => {
    render(<EditableWrapper {...defaultArgs} />)

    expect(screen.queryByRole('button', { name: /Reordenar/ })).not.toBeInTheDocument()
  })

  test('puts a named drag handle beside the other actions', () => {
    const { container } = renderSortable(draggableArgs)

    const handle = screen.getByRole('button', { name: 'Reordenar Bienvenidos al laboratorio' })
    const actions = container.querySelector('.editable-actions') as HTMLElement
    expect(within(actions).getAllByRole('button')).toEqual([
      handle,
      screen.getByRole('button', { name: 'Editar' }),
    ])
    expect(handle).toHaveAttribute('aria-roledescription', 'reordenable')
  })

  test('renders no drag handle when the record has no such position field', () => {
    const { container } = renderSortable(withoutPositionArgs)

    expect(screen.queryByRole('button', { name: /Reordenar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(container.querySelector('.editable')).not.toHaveAttribute('data-position-field')
  })

  test('renders no drag handle when the field is there but is not a position', () => {
    renderSortable({
      ...draggableArgs,
      drag: true,
      dragId: 'bienvenida',
      positionField: 'title',
      record: { id: 'bienvenida', title: 'Bienvenidos al laboratorio', position: 0 },
    })

    expect(screen.queryByRole('button', { name: /Reordenar/ })).not.toBeInTheDocument()
  })

  test('names the handle and its role in the language it is given', () => {
    renderSortable({
      ...draggableArgs,
      drag: true,
      dragId: 'bienvenida',
      dragLabel: 'Reorder Welcome',
      dragRoleDescription: 'sortable',
      positionField: 'position',
      record: { position: 0 },
    })

    expect(screen.getByRole('button', { name: 'Reorder Welcome' })).toHaveAttribute(
      'aria-roledescription',
      'sortable',
    )
  })

  test('falls back to a Spanish handle name', () => {
    renderSortable({
      children: draggableArgs.children,
      drag: true,
      dragId: 'bienvenida',
      positionField: 'position',
      record: { position: 0 },
    })

    expect(screen.getByRole('button', { name: 'Reordenar' })).toBeInTheDocument()
  })

  test('tells the list which column holds its order', () => {
    const custom = renderSortable({
      ...draggableArgs,
      drag: true,
      dragId: 'bienvenida',
      positionField: 'sortOrder',
      record: { sortOrder: 3 },
    })

    expect(custom.container.querySelector('.editable')).toHaveAttribute(
      'data-position-field',
      'sortOrder',
    )
  })
})
