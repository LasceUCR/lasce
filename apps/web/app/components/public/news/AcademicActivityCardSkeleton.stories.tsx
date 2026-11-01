import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityCardSkeleton } from './AcademicActivityCardSkeleton'

const meta: Meta<typeof AcademicActivityCardSkeleton> = {
  component: AcademicActivityCardSkeleton,
  title: 'Public/News/AcademicActivityCardSkeleton',
}

export default meta
type Story = StoryObj<typeof AcademicActivityCardSkeleton>

export const Default: Story = {}

export const List: StoryObj<typeof AcademicActivitiesListSkeleton> = {
  render: () => <AcademicActivitiesListSkeleton count={3} />,
}

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}
