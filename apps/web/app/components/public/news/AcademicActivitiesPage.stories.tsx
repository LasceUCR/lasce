import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { academicActivities } from '@/app/lib/academic-activities'

import { AcademicActivitiesPage } from './AcademicActivitiesPage'

const meta: Meta<typeof AcademicActivitiesPage> = {
  component: AcademicActivitiesPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof AcademicActivitiesPage>

export const Default: Story = {
  args: {
    activities: academicActivities,
  },
}

export const Empty: Story = {
  args: {
    activities: [],
  },
}
