import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { TeamMember } from '@/app/lib/rosac'

import { ResearcherForm } from './ResearcherForm'

const meta: Meta<typeof ResearcherForm> = {
  component: ResearcherForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearcherForm>

const mockResearcher: TeamMember = {
  id: 'carolina-salas',
  src: '/images/ROSAC/team/CarolinaSalas.jpg',
  name: 'Dra. Carolina Salas Matamoros',
  role: 'Investigadora principal',
  email: 'carolina.salas_mata@ucr.ac.cr',
  institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
  description:
    'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio, así como líder en la gestión y análisis de los datos obtenidos a través de dicho instrumento.',
}

export const EditExisting: Story = {
  args: {
    researcher: mockResearcher,
    onCancel: () => {},
    onSave: () => {},
  },
}

export const AddNew: Story = {
  args: {
    researcher: null,
    onCancel: () => {},
    onSave: () => {},
  },
}
