import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsCard } from './NewsCard'

const meta: Meta<typeof NewsCard> = {
  component: NewsCard,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof NewsCard>

export const Default: Story = {
  args: {
    title:
      '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
    authors: 'Jorge Arturo Mora',
    source: 'La Nación – Revista Dominical',
    date: '24 de mayo de 2026',
    publishedAt: '2026-05-24',
    abstract:
      'Reportaje sobre proyectos científicos y tecnológicos de vanguardia desarrollados en Costa Rica que desafían la percepción de que en el país no se hace ciencia avanzada. Entre las iniciativas destacadas figura el radiotelescopio solar ROSAC de la Universidad de Costa Rica en Santa Cruz, Guanacaste, junto a investigaciones sobre implantes óseos en el Tecnológico de Costa Rica y desarrollos en el CeNAT, evidenciando el impacto y rigor de la investigación nacional.',
    href: 'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
  },
}

/** Some coverage carries no publish date; `getNews()` shows it as "Sin fecha". */
export const Undated: Story = {
  args: { ...Default.args, date: 'Sin fecha', publishedAt: null },
}

export const WithoutSummary: Story = {
  args: { ...Default.args, abstract: '' },
}

/** A long title, author list and summary wrap and clamp instead of widening the card. */
export const LongText: Story = {
  args: {
    ...Default.args,
    title:
      'Investigadores del Laboratorio de Ciencias Espaciales presentan resultados sobre la propagación interplanetaria de eyecciones de masa coronal dirigidas a la Tierra durante el ciclo solar 25',
    authors:
      'Carolina Salas-Matamoros, Jaime Sánchez-Guevara, Ana Lucía Rodríguez-Villalobos, Marco Antonio Jiménez-Quesada',
    source:
      'https://www.ucr.ac.cr/noticias/2026/05/24/un-enlace-muy-largo-sin-espacios-que-no-debe-desbordar',
    abstract:
      'Un resumen extenso que ocupa más de dos líneas para mostrar el recorte con puntos suspensivos: el equipo analizó decenas de eventos registrados por instrumentos en tierra y en el espacio, y comparó sus trayectorias con modelos geométricos para estimar tiempos de llegada.',
  },
}

export const WithoutLink: Story = {
  args: { ...Default.args, href: '' },
}
