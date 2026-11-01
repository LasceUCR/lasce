import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LocationMapSkeleton } from './LocationMapSkeleton'

const meta: Meta<typeof LocationMapSkeleton> = { component: LocationMapSkeleton }
export default meta

type Story = StoryObj<typeof LocationMapSkeleton>

export const Loading: Story = { args: { label: 'Cargando el mapa…' } }

/** A parent, such as the contact page skeleton, already announces the load. */
export const Quiet: Story = {}
