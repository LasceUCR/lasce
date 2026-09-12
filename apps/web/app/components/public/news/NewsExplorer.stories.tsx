import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsExplorer } from './NewsExplorer'
import type { NewsArticle } from '@/app/lib/news'

const meta: Meta<typeof NewsExplorer> = {
  component: NewsExplorer,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof NewsExplorer>

const mockNews: NewsArticle[] = [
  {
    slug: 'mock-1',
    title:
      '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
    authors: 'Jorge Arturo Mora',
    source: 'La Nación – Revista Dominical',
    date: '24 de mayo de 2026',
    abstract:
      'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC, el radiotelescopio de la Universidad de Costa Rica dedicado al estudio de la actividad solar.',
    href: 'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
    imageUrl: '/images/news/la-nacion-1.png',
  },
  {
    slug: 'mock-2',
    title:
      'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en el país',
    authors: 'Alonso Martinez',
    source: 'Delfino.cr',
    date: '5 de diciembre de 2025',
    abstract:
      'Un proyecto de la UCR busca generar datos propios sobre la actividad solar y desarrollar herramientas para estudiar y predecir el impacto del clima espacial en Costa Rica.',
    href: 'https://delfino.cr/2025/12/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-el-pais',
    imageUrl: '/images/news/delfino-1.png',
  },
  {
    slug: 'mock-3',
    title:
      'Prysmian dona $36.000 en cables de energía y telecomunicaciones para el desarrollo del único radio telescopio solar de su tipo en Centroamérica',
    authors: 'Prysmian',
    source: 'Prysmian Pro',
    date: 'Sin fecha',
    abstract:
      'Prysmian donó cerca de tres kilómetros de cables de energía y telecomunicaciones para apoyar el desarrollo y puesta en funcionamiento del radiotelescopio solar ROSAC.',
    href: 'https://prysmianpro.com/en/prysmian-group-dona-36-000-en-cables-de-energia-y-telecomunicaciones-para-el-desarrollo-del-unico-radio-telescopio-solar-de-su-tipo-en-centroamerica/',
    imageUrl: '/images/decorative/Solar-Flare.png',
  },
]

export const Default: Story = {
  args: {
    news: mockNews,
  },
}

export const Empty: Story = {
  args: {
    news: [],
  },
}
