import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NosotrosActivityForm } from './NosotrosActivityForm'

const meta: Meta<typeof NosotrosActivityForm> = {
  component: NosotrosActivityForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof NosotrosActivityForm>

export const Default: Story = {
  args: {
    activity: {
      icon: 'sun',
      title: 'Fenómenos solares eruptivos',
      description:
        "Analizamos fenómenos solares eruptivos, como 'flares', eyecciones de masa coronal (CMEs, por sus siglas en inglés) y emisiones solares de radio.",
    },
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A blank form for a new card. "Confirmar" saves straight away, with no confirmation dialog. */
export const Create: Story = {
  args: {
    activity: { icon: 'sun', title: '', description: '' },
    onCancel: () => {},
    onSave: () => {},
  },
}
