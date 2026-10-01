import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AcademicActivityCard } from './AcademicActivityCard'
import { academicActivities } from '@/app/lib/academic-activities'

const meta: Meta<typeof AcademicActivityCard> = {
  component: AcademicActivityCard,
}

export default meta

type Story = StoryObj<typeof AcademicActivityCard>

export const Default: Story = {
  args: {
    activity: academicActivities[0],
  },
}
