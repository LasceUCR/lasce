import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchAreasSection } from './ResearchAreasSection'
import { researchAreas } from '@/app/lib/research-areas'

const meta: Meta<typeof ResearchAreasSection> = {
  component: ResearchAreasSection,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof ResearchAreasSection>

// The live list rather than a copy of it: the areas are static content, so the story and its
// test always show exactly what `/investigacion` does, however many areas there are.
export const Default: Story = {
  args: {
    id: 'research-areas',
    areas: researchAreas,
  },
}

export const Empty: Story = {
  args: {
    id: 'research-areas-empty',
    areas: [],
  },
}
