import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsCard } from './NewsCard'
import type { NewsArticle } from '@/app/lib/news'

const meta: Meta<typeof NewsCard> = {
  component: NewsCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof NewsCard>

const mockNews: NewsArticle = {
  slug: 'mock-slug',
  title: '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
  authors: 'Jorge Arturo Mora',
  source: 'La Nación – Revista Dominical',
  date: '24 de mayo de 2026',
  abstract:
    'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC, el radiotelescopio de la Universidad de Costa Rica dedicado al estudio de la actividad solar.',
  href: 'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
  imageUrl: '/images/news/la-nacion-1.png',
}

export const Default: Story = {
  args: {
    title: mockNews.title,
    authors: mockNews.authors,
    source: mockNews.source,
    date: mockNews.date,
    abstract: mockNews.abstract,
    href: mockNews.href,
    imageUrl: mockNews.imageUrl,
  },
}
