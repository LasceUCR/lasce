import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditableWrapper } from './EditableWrapper'

const meta: Meta<typeof EditableWrapper> = {
  component: EditableWrapper,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableWrapper>

export const Default: Story = {
  args: {
    children: (
      <div style={{ padding: '32px' }}>
        <h2>Bienvenidos al laboratorio</h2>
      </div>
    ),
    onDelete: () => {},
    onEdit: () => {},
  },
}

export const EditOnly: Story = {
  args: {
    children: Default.args?.children,
    onEdit: () => {},
  },
}

/**
 * `drag`: a handle beside the other actions reorders the item, because its `record` holds the
 * `positionField`. Rendered here inside the `DndContext` and `SortableContext` that the list
 * around it provides in a real page.
 */
export const Draggable: Story = {
  args: {
    children: Default.args?.children,
    onEdit: () => {},
    drag: true,
    dragId: 'bienvenida',
    dragLabel: 'Reordenar Bienvenidos al laboratorio',
    positionField: 'position',
    record: { id: 'bienvenida', position: 0 },
  },
  decorators: [
    (Story) => (
      <DndContext>
        <SortableContext items={['bienvenida']}>
          <Story />
        </SortableContext>
      </DndContext>
    ),
  ],
}

/** `drag` on an item whose table has no position column: no handle, only its other actions. */
export const DragWithoutPositionField: Story = {
  args: {
    ...Draggable.args,
    drag: true,
    dragId: 'bienvenida',
    positionField: 'position',
    record: { id: 'bienvenida', title: 'Bienvenidos al laboratorio' },
  },
  decorators: Draggable.decorators,
}
