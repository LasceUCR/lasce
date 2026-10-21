import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { englishArticle, spanishArticle } from './fixtures'
import { NewsCard } from './NewsCard'

const meta: Meta<typeof NewsCard> = {
  component: NewsCard,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof NewsCard>

const { title, authors, source, date, publishedAt, abstract, href } = spanishArticle

export const Default: Story = {
  args: { title, authors, source, date, publishedAt, abstract, href, contentLang: 'es' },
}

/** The same item for a visitor reading in English: its translation and an English date. */
export const English: Story = {
  args: {
    ...Default.args,
    title: englishArticle.title,
    abstract: englishArticle.abstract,
    date: englishArticle.date,
    contentLang: 'en',
  },
  globals: { locale: 'en' },
}

/** Some coverage carries no publish date; the card says "Sin fecha" in the site's language. */
export const Undated: Story = {
  args: { ...Default.args, date: null, publishedAt: null },
}

/**
 * An editor's view of an item saved before languages existed: its text's language is unknown
 * (`lang=""`) and a note says it has no English version yet.
 */
export const TranslationMissing: Story = {
  args: { ...Default.args, contentLang: '', translationMissing: true },
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
