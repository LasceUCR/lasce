import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArrowLeft } from 'lucide-react'

import { EditableWrapper } from './EditableWrapper'

const meta: Meta<typeof EditableWrapper> = {
  component: EditableWrapper,
  parameters: {
    layout: 'centered',
  },
}

export default meta

const mockOnEdit = (contentId: string, contentType: string) => {
  window.alert(
    `Opening editor\n\nType: ${contentType}\nID: ${contentId}`,
  )
}

type Story = StoryObj<typeof EditableWrapper>
export const Tittle: Story = {
  args: {
    children: (
      <div style={{ padding: '32px' }}>
        <h2>Welcome to our website</h2>
      </div>
    ),
    onEdit: () => mockOnEdit("Titulo", "0"),
    editable: true
  },
}

