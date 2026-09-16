import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacConstructionContent } from '@/app/lib/rosac-construction'

import { ConstructionCarousel } from './ConstructionCarousel'

const meta: Meta<typeof ConstructionCarousel> = {
  component: ConstructionCarousel,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof ConstructionCarousel>

export const Default: Story = {
  args: { stages: rosacConstructionContent.stages },
}

export const Assembly: Story = {
  args: Default.args,
  play: async ({ canvas, userEvent }) => {
    for (let index = 0; index < 2; index++) {
      await userEvent.click(canvas.getByRole('button', { name: 'Etapa siguiente' }))
    }
  },
}

export const SinglePhotoStage: Story = {
  args: Default.args,
  play: async ({ canvas, userEvent }) => {
    for (let index = 0; index < 3; index++) {
      await userEvent.click(canvas.getByRole('button', { name: 'Etapa siguiente' }))
    }
  },
}

export const SecondPhoto: Story = {
  args: Default.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Fotografía siguiente' }))
  },
}

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'rosacConstructionMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        rosacConstructionMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
