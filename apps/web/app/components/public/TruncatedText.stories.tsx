import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TruncatedText } from './TruncatedText'

const meta: Meta<typeof TruncatedText> = {
  component: TruncatedText,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '420px', fontSize: '14px', lineHeight: 1.5 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof TruncatedText>

const longText =
  'Diseña y desarrolla plataformas informáticas para capturar, procesar, almacenar y consultar grandes volúmenes de datos solares provenientes de distintas fuentes. Esta rama también implementa bases de datos y servicios web especializados, y facilita el análisis interdisciplinario de la información en colaboración con investigadores en astrofísica solar y clima espacial.'

/** Longer than three lines: clamped, with "Leer más". */
export const Long: Story = {
  args: { lines: 3, children: longText },
}

/** Fits in three lines: shown as is, with no toggle. */
export const Short: Story = {
  args: { lines: 3, children: 'Estudia las emisiones solares de radio.' },
}

/** One line, with labels of its own. */
export const OneLineCustomLabels: Story = {
  args: {
    lines: 1,
    children: longText,
    readMoreLabel: 'Ver descripción completa',
    readLessLabel: 'Ocultar descripción',
  },
}
