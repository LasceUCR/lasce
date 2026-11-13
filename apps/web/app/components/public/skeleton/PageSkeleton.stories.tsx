import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PageSkeleton } from './PageSkeleton'

const meta: Meta<typeof PageSkeleton> = {
  component: PageSkeleton,
  args: {
    cards: 3,
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof PageSkeleton>

/** A public page while the server renders it: heading, lead and three cards. */
export const Default: Story = {}

/** With a label of its own instead of "Cargando…". */
export const CustomLabel: Story = {
  args: {
    label: 'Cargando la página…',
  },
}

/** Just the heading, for a page that is mostly text. */
export const HeadingOnly: Story = {
  args: {
    cards: 0,
  },
}
