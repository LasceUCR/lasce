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
