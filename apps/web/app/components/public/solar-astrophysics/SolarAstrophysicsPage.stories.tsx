import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { solarAstrophysicsContent } from '@/app/lib/solar-astrophysics'
import type { SolarPhysicsSection } from '@/app/lib/solar-physics-section-schema'

import { SolarAstrophysicsPage } from './SolarAstrophysicsPage'

/** The LASCE section as a visitor reads it, in Spanish. */
export const lasceSection: SolarPhysicsSection = {
  title: 'El trabajo de LASCE en Física Solar',
  paragraphs: [
    'El Laboratorio de Astrofísica Solar y Clima Espacial reúne investigación en astrofísica solar, observaciones astronómicas y desarrollo computacional para estudiar la actividad solar y su interacción con el entorno terrestre.',
    'Su trabajo integra datos de diferentes instrumentos, longitudes de onda y plataformas para observar distintos eslabones de una misma cadena: desde el origen magnético de una erupción solar hasta sus manifestaciones cerca de la Tierra.',
    'Desde la Universidad de Costa Rica, LASCE busca fortalecer capacidades científicas nacionales para analizar la relación Sol-Tierra, formar talento e impulsar colaboraciones en el estudio del clima espacial.',
  ],
  contentLocale: 'es',
}

const meta: Meta<typeof SolarAstrophysicsPage> = {
  component: SolarAstrophysicsPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof SolarAstrophysicsPage>

export const Default: Story = {
  args: { content: solarAstrophysicsContent, lasceSection },
}

/** The section row is missing from the database: the page simply leaves the section out. */
export const WithoutLasceSection: Story = {
  args: { content: solarAstrophysicsContent, lasceSection: null },
}
