import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { rosacInfoContent } from '@/app/lib/rosac'
import { LocationUnavailable } from './LocationUnavailable'

const meta: Meta<typeof LocationUnavailable> = { component: LocationUnavailable }
export default meta
type Story = StoryObj<typeof LocationUnavailable>
export const Unavailable: Story = {
  args: { message: rosacInfoContent.location.unavailableMessage },
}
