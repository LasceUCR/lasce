import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AcademicActivityPage } from './AcademicActivityPage'
import { academicActivities } from '@/app/lib/academic-activities'

const meta: Meta<typeof AcademicActivityPage> = {
  component: AcademicActivityPage,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof AcademicActivityPage>

export const Default: Story = {
  args: {
    activity: academicActivities[0],
    backHref: '/noticias',
    backLabel: 'Volver a noticias',
  },
}
