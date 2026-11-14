import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryPageSkeleton } from './GalleryPageSkeleton'

const meta: Meta<typeof GalleryPageSkeleton> = {
  component: GalleryPageSkeleton,
  args: {
    kicker: 'Portal público LASCE',
    title: 'Galería',
    lead: 'Fotografías y video de las actividades del laboratorio: construcción e instrumentación, observación y vida cotidiana del equipo. Organizada por álbumes.',
    label: 'Cargando galería…',
    backLabel: 'Volver al inicio',
  },
}
export default meta

type Story = StoryObj<typeof GalleryPageSkeleton>

export const Default: Story = {}
