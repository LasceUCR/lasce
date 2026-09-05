import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PublicationCard } from './PublicationCard'

const meta: Meta<typeof PublicationCard> = {
  component: PublicationCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof PublicationCard>

export const Default: Story = {
  args: {
    title:
      'Microwave radio emissions as a proxy for coronal mass ejection speed in arrival predictions of interplanetary coronal mass ejections at 1 AU',
    authors: 'C. Salas-Matamoros, L. Klein, G. Trottet',
    venue: 'Journal of Space Weather and Space Climate',
    year: '2017',
    abstract:
      'The propagation of a coronal mass ejection (CME) to the Earth takes between about 15 h and several days. We explore whether observations of non-thermal microwave bursts, produced by near-relativistic electrons via the gyrosynchrotron process, can be used to predict travel times of interplanetary coronal mass ejections (ICMEs) from the Sun to the Earth. In a first step, a relationship is established between the CME speed measured by SoHO/LASCO near the solar limb and the fluence of the microwave burst.',
    href: '#',
  },
}

export const InstitutionalReport: Story = {
  args: {
    title: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
    authors: 'LASCE',
    venue: 'Nota institucional, Vicerrectoría de Investigación UCR',
    year: '2022',
    abstract:
      'A research project is studying how to convert a gigantic antenna that was originally used to monitor a satellite, into a radio telescope that will help to study the stars. This is the antenna currently installed at the UCR Experimental Farm in Santa Cruz (FESC).',
    href: '#',
  },
}
