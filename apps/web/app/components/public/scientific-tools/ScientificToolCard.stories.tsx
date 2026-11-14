import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScientificToolCard } from './ScientificToolCard'

const meta: Meta<typeof ScientificToolCard> = {
  component: ScientificToolCard,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof ScientificToolCard>

export const Default: Story = {
  args: {
    tool: {
      name: 'SWAAT',
      description:
        'Análisis de eventos solares mediante observaciones de rayos X de GOES y microondas de RSTN. Permite visualizar y comparar su evolución temporal con gráficas estáticas e interactivas.',
      href: 'https://swaat.up.railway.app/',
      imageUrl: '/images/tools/SWAAT-sun.webp',
      contentLocale: 'es',
    },
  },
}

/** A tool saved without an image shows a neutral illustration instead. */
export const NoImage: Story = {
  args: { tool: { ...Default.args!.tool!, name: 'SWAPRO', imageUrl: null } },
}

/** A tool whose description has no translation yet: its language is unknown. */
export const Legacy: Story = {
  args: { tool: { ...Default.args!.tool!, contentLocale: null } },
}
