import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ManagementModal } from './ManagementModal'

const meta: Meta<typeof ManagementModal> = {
  component: ManagementModal,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof ManagementModal>

export const BlankNewRecord: Story = {
  args: {
    open: true,
    initialValues: {},
    onClose: () => {},
    onSave: () => {},
    onDelete: () => {},
  },
}

export const PreFilledEditing: Story = {
  args: {
    open: true,
    initialValues: {
      hasPhoto: true,
      name: 'Dra. Carolina Salas Matamoros',
      role: 'Astrofísica Solar e Investigadora Principal',
      institution: 'Escuela de Física, Universidad de Costa Rica',
      email: 'carolina.salas@ucr.ac.cr',
      bio: 'Investigadora dedicada al análisis de clima espacial y eyecciones de masa coronal.',
    },
    onClose: () => {},
    onSave: () => {},
    onDelete: () => {},
  },
}

export const SimulatedSaveError: Story = {
  args: {
    ...PreFilledEditing.args,
    simulateSaveError: true,
  },
}
