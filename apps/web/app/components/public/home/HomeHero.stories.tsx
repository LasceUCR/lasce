import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { HomeHero } from './HomeHero'

const meta: Meta<typeof HomeHero> = {
  component: HomeHero,
  decorators: [
    (Story) => (
      <section className="hero">
        <div className="hero-content page-width">
          <Story />
        </div>
      </section>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof HomeHero>

export const Spanish: Story = {
  args: {
    title: 'Exploramos el Sol para comprender el clima espacial',
    lead: 'Investigamos la actividad solar y sus efectos en el medio interplanetario y la Tierra, mediante observaciones, instrumentación, análisis de datos y desarrollo científico.',
    contentLang: 'es',
  },
}

export const English: Story = {
  args: {
    title: 'We explore the Sun to understand space weather',
    lead: 'We study solar activity and its effects on the interplanetary medium and the Earth through observations, instrumentation, data analysis and scientific development.',
    contentLang: 'en',
  },
}

/** Saved before it had an English version: its language is unknown, so `lang` is empty. */
export const UnknownLanguage: Story = {
  args: { ...Spanish.args, contentLang: '' },
}
