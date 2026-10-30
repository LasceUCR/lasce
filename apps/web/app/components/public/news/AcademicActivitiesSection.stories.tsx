import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AcademicActivitiesSection } from './AcademicActivitiesSection'
import { mockActivity } from './AcademicActivityCard.stories'

const meta: Meta<typeof AcademicActivitiesSection> = {
  component: AcademicActivitiesSection,
  title: 'Public/News/AcademicActivitiesSection',
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
