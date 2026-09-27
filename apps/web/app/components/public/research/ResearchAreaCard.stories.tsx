import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchAreaCard } from './ResearchAreaCard'

const meta: Meta<typeof ResearchAreaCard> = {
  component: ResearchAreaCard,
  parameters: { layout: 'padded' },
  decorators: [
    // The card fills the page column on `/investigacion`, so the story gives it the same width.
    (Story) => (
      <div style={{ width: 'min(100%, 1332px)' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof ResearchAreaCard>

export const Default: Story = {
  args: {
    title: 'Radioastronomía solar y evolución de Flares-CMEs',
    description:
      'Estudia las emisiones solares de radio y su relación con los flares, la evolución de las eyecciones de masa coronal, la aceleración de partículas y su propagación hacia el medio interplanetario.',
    href: '/investigacion/areas/radioastronomia-solar-evolucion-flares-cmes',
    src: '/images/research/radioastronomia-solar-evolucion-flares-cmes.jpg',
  },
}

export const WithoutImage: Story = {
  args: {
    title: 'Geomagnetismo y respuesta regional al clima espacial',
    description:
      'Analiza las variaciones del campo magnético terrestre producidas por la actividad solar. Incluye el cálculo de índices geomagnéticos para Costa Rica.',
    href: '/investigacion/areas/geomagnetismo-respuesta-regional-clima-espacial',
  },
}

export const LongDescription: Story = {
  args: {
    title: 'Infraestructura informática y gestión de datos de clima espacial',
    description:
      'Diseña y desarrolla plataformas informáticas para capturar, procesar, almacenar y consultar grandes volúmenes de datos solares provenientes de distintas fuentes. Esta rama también implementa bases de datos y servicios web especializados, y facilita el análisis interdisciplinario de la información en colaboración con investigadores en astrofísica solar y clima espacial.',
    href: '/investigacion/areas/infraestructura-informatica-gestion-datos-clima-espacial',
    src: '/images/research/infraestructura-informatica-gestion-datos-clima-espacial.png',
  },
}
