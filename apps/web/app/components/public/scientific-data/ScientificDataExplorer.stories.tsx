import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import {
  scientificSources,
  type DynamicSpectrumDataResult,
  type ImageSequenceDataResult,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

import { ScientificDataExplorer } from './ScientificDataExplorer'

const initialQuery: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}

const resultFixture: TimeSeriesDataResult = {
  query: initialQuery,
  instrument: { code: 'EXIS', name: scientificSources[0]!.instruments[0]!.name },
  product: { code: 'SFXR', name: 'Flujo solar: rayos X' },
  parameter: { code: '0.1-0.8nm', label: 'Banda larga (0,1–0,8 nm)', unit: 'W/m²' },
  origin: {
    kind: 'observed',
    provider: 'NOAA Space Weather Prediction Center',
    notice: 'Datos observados del servicio público GOES primario de NOAA.',
    satellite: 18,
  },
  visualization: 'time-series',
  points: [
    { timestamp: '2026-09-10T08:00:00Z', value: 0.0000064 },
    { timestamp: '2026-09-10T08:15:00Z', value: 0.0000078 },
    { timestamp: '2026-09-10T08:30:00Z', value: 0.0000069 },
    { timestamp: '2026-09-10T08:45:00Z', value: 0.0000057 },
  ],
}

const rosacQuery: ScientificDataQuery = {
  source: 'ROSAC',
  product: 'ROSAC-I2',
  parameter: 'simulated-spectrum',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '08:10',
}

const rosacSpectrumFixture: DynamicSpectrumDataResult = {
  query: rosacQuery,
  instrument: { code: 'ROSAC-I2', name: 'Instrumento 2 (por definir)' },
  product: { code: 'ROSAC-I2', name: 'Espectro dinámico de prueba' },
  parameter: {
    code: 'simulated-spectrum',
    label: 'Intensidad espectral simulada',
    unit: 'intensidad relativa',
  },
  origin: {
    kind: 'simulated',
    provider: 'Prototipo ROSAC — UCR',
    notice: 'Datos simulados para preparar la integración de ROSAC.',
  },
  visualization: 'dynamic-spectrum',
  frequencyUnit: 'MHz',
  timestamps: ['2026-09-10T08:00:00Z', '2026-09-10T08:10:00Z'],
  frequencies: [100, 200],
  cells: [
    { timestamp: '2026-09-10T08:00:00Z', frequency: 100, value: 18 },
    { timestamp: '2026-09-10T08:00:00Z', frequency: 200, value: 36 },
    { timestamp: '2026-09-10T08:10:00Z', frequency: 100, value: 28 },
    { timestamp: '2026-09-10T08:10:00Z', frequency: 200, value: 62 },
  ],
}

const suviQuery: ScientificDataQuery = {
  source: 'GOES',
  product: 'Fe171',
  parameter: 'image',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}

const suviFixture: ImageSequenceDataResult = {
  query: suviQuery,
  instrument: { code: 'SUVI', name: 'Generador de imágenes solares ultravioleta' },
  product: { code: 'Fe171', name: 'Imágenes solares: 171 Å (Fe171)' },
  parameter: { code: 'image', label: 'Imagen calibrada', unit: 'imagen' },
  origin: {
    kind: 'simulated',
    provider: 'Muestra local de Storybook',
    notice: 'Imagen de demostración del componente; esta historia no consulta NOAA.',
  },
  visualization: 'image-sequence',
  images: [
    {
      timestamp: '2026-09-10T08:30:00Z',
      imageUrl: '/images/decorative/Solar-Flare.png',
      alt: 'Imagen solar de demostración del componente',
    },
  ],
}

const meta: Meta<typeof ScientificDataExplorer> = {
  component: ScientificDataExplorer,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof ScientificDataExplorer>

export const Default: Story = {
  args: {
    sources: scientificSources,
    initialQuery,
    goesDateRange: { min: '2026-09-04', max: '2026-09-10' },
  },
}

export const WithObservedResults: Story = {
  args: { ...Default.args, initialResult: resultFixture },
}

export const WithoutResults: Story = {
  args: { ...Default.args, initialResult: { ...resultFixture, points: [] } },
}

export const WithRosacDynamicSpectrum: Story = {
  args: { ...Default.args, initialQuery: rosacQuery, initialResult: rosacSpectrumFixture },
}

export const WithSuviImages: Story = {
  args: { ...Default.args, initialQuery: suviQuery, initialResult: suviFixture },
}
