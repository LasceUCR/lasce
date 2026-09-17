import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacConstructionContent } from '@/app/lib/rosac-construction'

import { ConstructionCarousel } from './ConstructionCarousel'

// The interaction itself (looping, group boundaries, keyboard, mobile
// layout, ...) is exercised on the shared component in
// Carousel.stories.tsx. This just proves the ROSAC wrapper renders that
// component with the real page data and the ROSAC accessible name.
const meta: Meta<typeof ConstructionCarousel> = {
  component: ConstructionCarousel,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof ConstructionCarousel>

export const Default: Story = {
  args: { stages: rosacConstructionContent.stages },
}
