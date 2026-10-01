import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInfoContent } from '@/app/lib/rosac'

import { AcknowledgmentsGallery } from './AcknowledgmentsGallery'

const meta: Meta<typeof AcknowledgmentsGallery> = {
  component: AcknowledgmentsGallery,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof AcknowledgmentsGallery>

export const Default: Story = {
  args: {
    label: rosacInfoContent.acknowledgments.title,
    institutions: rosacInfoContent.acknowledgments.institutions,
  },
}

/** A single institution still renders as a one-card track, not a layout oddity. */
export const SingleInstitution: Story = {
  args: {
    label: rosacInfoContent.acknowledgments.title,
    institutions: rosacInfoContent.acknowledgments.institutions.slice(0, 1),
  },
}
