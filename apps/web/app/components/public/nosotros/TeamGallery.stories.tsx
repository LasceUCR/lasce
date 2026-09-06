import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TeamGallery } from './TeamGallery'

const meta: Meta<typeof TeamGallery> = {
  component: TeamGallery,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof TeamGallery>

// The portraits are not in the repository yet, so the stories use the existing decorative
// asset as a stand-in. Real files land under public/images/equipo/ with the approved copy.
const placeholder = '/images/decorative/goes-suvi-195-fallback.png'

export const Default: Story = {
  args: {
    label: 'El equipo',
    people: [
      { src: placeholder, name: 'Ana Mora', role: 'Coordinación' },
      { src: `${placeholder}#2`, name: 'Luis Vargas', role: 'Instrumentación' },
      { src: `${placeholder}#3`, name: 'Carla Jiménez' },
    ],
  },
}

export const Empty: Story = {
  args: { label: 'El equipo', people: [] },
}
