import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AcademicActivitiesSection } from './AcademicActivitiesSection'
import { academicActivities } from '@/app/lib/academic-activities'

const meta: Meta<typeof AcademicActivitiesSection> = {
  component: AcademicActivitiesSection,
}

export default meta

type Story = StoryObj<typeof AcademicActivitiesSection>

export const Default: Story = {
  args: {
    activities: academicActivities,
    id: 'academic-activities',
  },
}

export const Empty: Story = {
  args: {
    activities: [],
    id: 'academic-activities-empty',
  },
}
