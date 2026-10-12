import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsArticlePage } from './NewsArticlePage'

const meta: Meta<typeof NewsArticlePage> = {
  component: NewsArticlePage,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof NewsArticlePage>

export const Default: Story = {
  args: {
    article: {
      slug: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      authors: 'Gerardo Quesada A.',
      source: 'El Norte Hoy',
      date: '2 de octubre de 2023',
      publishedAt: '2023-10-02',
      abstract:
        'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
      href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
    },
    backHref: '/noticias',
    backLabel: 'Volver a noticias',
  },
}

export const MinimalDetails: Story = {
  args: {
    article: {
      slug: 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac271b22',
      title: 'Avances en astrofísica solar',
      authors: '',
      source: 'LASCE',
      date: 'Sin fecha',
      publishedAt: null,
      abstract: 'Breve nota informativa sobre las actividades recientes del laboratorio.',
      href: '',
    },
    backHref: '/noticias',
    backLabel: 'Volver a noticias',
  },
}
