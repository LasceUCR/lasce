import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacConstructionContent } from '@/app/lib/rosac-construction'

import { Carousel } from './Carousel'

// The ROSAC construction stages double as a realistic fixture here: five
// groups, including one with a single photo, which is exactly the shape a
// reusable carousel needs to prove out (looping, boundaries, hidden photo
// controls). See ConstructionCarousel.stories.tsx for the wrapper as it
// actually ships on the page.
const meta: Meta<typeof Carousel> = {
  component: Carousel,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof Carousel>

export const Default: Story = {
  args: { groups: rosacConstructionContent.stages, ariaLabel: 'Proceso de construcción del ROSAC' },
}

export const CustomLabels: Story = {
  args: {
    ...Default.args,
    groupNoun: 'Sección',
    photoNoun: 'Imagen',
    previousGroupLabel: 'Sección previa',
    nextGroupLabel: 'Sección siguiente',
    previousPhotoLabel: 'Imagen previa',
    nextPhotoLabel: 'Imagen siguiente',
  },
}

export const Assembly: Story = {
  args: Default.args,
  play: async ({ canvas, userEvent }) => {
    for (let index = 0; index < 2; index++) {
      await userEvent.click(canvas.getByRole('button', { name: 'Etapa siguiente' }))
    }
  },
}

export const SinglePhotoGroup: Story = {
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
  globals: { viewport: { value: 'carouselMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        carouselMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
