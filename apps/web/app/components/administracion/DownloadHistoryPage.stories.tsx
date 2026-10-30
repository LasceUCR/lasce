import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DownloadHistoryPage } from './DownloadHistoryPage'

const noFilters = { from: '', to: '', source: '', instrument: '', format: '', user: '' }
const options = {
  sources: ['GOES', 'ROSAC'],
  instruments: ['EXIS', 'MAG', 'SEISS', 'SUVI', 'ROSAC-I1', 'ROSAC-I2'],
  formats: ['png', 'csv'],
  users: [{ id: '0a7d5a3e-5a0c-4a55-8a53-4f6b1c0f7a11', name: 'Ana Rodríguez' }],
}
const window = { pageSize: 10, skip: 0, take: 10 }

const meta: Meta<typeof DownloadHistoryPage> = {
  component: DownloadHistoryPage,
  parameters: { layout: 'padded' },
  args: {
    title: 'Descargas',
    description: 'Historial y control de descargas de datos del laboratorio.',
    pathname: '/administracion/descargas',
  },
}

export default meta

type Story = StoryObj<typeof DownloadHistoryPage>

export const WithDownloads: Story = {
  args: {
    history: {
      ...window,
      page: 2,
      totalItems: 23,
      totalPages: 3,
      filters: noFilters,
      options,
      items: [
        {
          id: 'c5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e01',
          userName: 'Ana Rodríguez',
          source: 'GOES',
          instrument: 'EXIS',
          product: 'EXIS-L1b-SFXR',
          format: 'csv',
          date: '2026-10-15',
          startTime: '00:00',
          endTime: '23:59',
          downloadedAt: '2026-10-16T18:00:00.000Z',
        },
        {
          id: 'c5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e02',
          userName: null,
          source: 'ROSAC',
          instrument: 'ROSAC-I1',
          product: 'ROSAC-I1',
          format: 'png',
          date: '',
          startTime: '',
          endTime: '',
          downloadedAt: '2026-10-15T14:30:00.000Z',
        },
      ],
    },
  },
}

export const Empty: Story = {
  args: {
    history: {
      ...window,
      page: 1,
      totalItems: 0,
      totalPages: 0,
      filters: noFilters,
      options,
      items: [],
    },
  },
}

export const EmptyWithFilters: Story = {
  args: {
    history: {
      ...window,
      page: 1,
      totalItems: 0,
      totalPages: 0,
      filters: { ...noFilters, source: 'GOES' },
      options,
      items: [],
    },
  },
}
