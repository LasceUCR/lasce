import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { InputTimeField } from './InputTimeField'

const meta: Meta<typeof InputTimeField> = {
  component: InputTimeField,
}

export default meta

type Story = StoryObj<typeof InputTimeField>

export const Date: Story = {
  args: {
    type: 'date',
    disabled: false,
  },
}

export const Time: Story = {
  args: {
    type: 'time',
    disabled: false,
  },
}

export const Disabled: Story = {
  args: {
    type: 'time',
    disabled: true,
  },
}

export const Labeled: Story = {
  args: {
    type: 'time',
    disabled: false,
    label: 'StoryLable',
    id: 'storyId',
  },
}
