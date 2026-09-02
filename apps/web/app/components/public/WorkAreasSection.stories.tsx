import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  BookOpen,
  ChartNoAxesCombined,
  Orbit,
  RadioTower,
  Sun,
  Telescope,
} from 'lucide-react'

import type { WorkAreaItem } from './WorkAreasSection'
import { WorkAreasSection } from './WorkAreasSection'

const sampleAreas: WorkAreaItem[] = [
  {
    title: 'Física solar',
    description: 'Actividad y observaciones',
    href: '/investigacion',
    icon: <Sun size={25} strokeWidth={1.7} />,
  },
  {
    title: 'Clima espacial',
    description: 'Indicadores y monitoreo',
    href: '/datos',
    icon: <Orbit size={25} strokeWidth={1.7} />,
  },
  {
    title: 'Radioastronomía',
    description: 'Datos ROSAC',
    href: '/investigacion',
    icon: <RadioTower size={25} strokeWidth={1.7} />,
  },
  {
    title: 'Instrumentación',
    description: 'Instrumentos y citación',
    href: '/instrumentacion',
    icon: <Telescope size={25} strokeWidth={1.7} />,
  },
  {
    title: 'Datos y análisis',
    description: 'Consulta y descargas',
    href: '/datos',
    icon: <ChartNoAxesCombined size={25} strokeWidth={1.7} />,
  },
  {
    title: 'Divulgación',
    description: 'Noticias y recursos',
    href: '/noticias',
    icon: <BookOpen size={25} strokeWidth={1.7} />,
  },
]

const meta: Meta<typeof WorkAreasSection> = {
  component: WorkAreasSection,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof WorkAreasSection>

export const Default: Story = {
  args: {
    id: 'investigacion',
    title: 'Áreas y accesos principales',
    subtitle: 'Investigar, observar, analizar y compartir.',
    areas: sampleAreas,
  },
}

export const Empty: Story = {
  args: {
    title: 'Áreas y accesos principales',
    subtitle: 'Investigar, observar, analizar y compartir.',
    areas: [],
  },
}
