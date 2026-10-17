import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AcademicActivitiesSection } from './AcademicActivitiesSection'
import { mockActivity } from './AcademicActivityCard.stories'

const meta: Meta<typeof AcademicActivitiesSection> = {
  component: AcademicActivitiesSection,
}

export default meta

type Story = StoryObj<typeof AcademicActivitiesSection>

export const Default: Story = {
  args: {
    activities: [mockActivity],
    id: 'academic-activities',
  },
}

export const Empty: Story = {
  args: {
    activities: [],
    id: 'academic-activities-empty',
  },
}
