import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Brand } from './Brand'

const meta: Meta<typeof Brand> = {
  component: Brand,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof Brand>

function viewport(name: string, width: number) {
  const key = `brand${width}`
  return {
    globals: { viewport: { value: key, isRotated: false } },
    parameters: {
      viewport: {
        options: { [key]: { name, styles: { width: `${width}px`, height: '640px' } } },
      },
    },
  }
}

/** The full header lockup: UCR shield and signature, CINESPA and LASCE. */
export const Default: Story = {}

/** At 430px and below the lockup is reduced to the UCR shield and LASCE, both legible. */
export const Narrow: Story = {
  ...viewport('Phone (320px)', 320),
}

/** The same reduced lockup at a common phone width. */
export const Phone: Story = {
  ...viewport('Phone (375px)', 375),
}

/** The footer variant: the UCR logo on a dark background. */
export const Light: Story = {
  args: { light: true },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: 'var(--space-black)' }}>
        <Story />
      </div>
    ),
  ],
}
