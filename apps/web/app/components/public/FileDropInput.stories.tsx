import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { FileDropInput } from './FileDropInput'

const meta: Meta<typeof FileDropInput> = {
  component: FileDropInput,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof FileDropInput>

export const Empty: Story = {
  args: {
    label: 'Imagen',
    onFileSelect: () => {},
  },
}

export const WithExistingImage: Story = {
  args: {
    label: 'Imagen',
    existingImageUrl: '/images/decorative/Solar-Flare.png',
    helperText: 'Reemplace la imagen actual si lo desea.',
    onFileSelect: () => {},
  },
}
