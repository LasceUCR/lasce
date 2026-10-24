import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { academicActivities } from '@/app/lib/academic-activities'

import { AcademicActivitiesSection } from './AcademicActivitiesSection'

const meta: Meta<typeof AcademicActivitiesSection> = {
  component: AcademicActivitiesSection,
  title: 'Public/News/AcademicActivitiesSection',
}

export default meta
type Story = StoryObj<typeof AcademicActivitiesSection>

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

export const Loading: Story = {
  args: {
    activities: [],
    loading: true,
  },
}

export const ErrorState: Story = {
  args: {
    activities: [],
    error: 'No fue posible cargar las actividades académicas. Inténtelo de nuevo más tarde.',
  },
}
