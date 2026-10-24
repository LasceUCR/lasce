import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { academicActivities } from '@/app/lib/academic-activities'

import { AcademicActivitiesPage } from './AcademicActivitiesPage'

const meta: Meta<typeof AcademicActivitiesPage> = {
  component: AcademicActivitiesPage,
  title: 'Public/News/AcademicActivitiesPage',
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
