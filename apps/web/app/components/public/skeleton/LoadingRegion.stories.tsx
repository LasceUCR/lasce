import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LoadingRegion } from './LoadingRegion'
import { SkeletonImageCard } from './SkeletonImageCard'

const placeholders = (
  <ul className="data-image-grid data-image-strip">
    {Array.from({ length: 5 }, (_, index) => (
      <li key={index}>
        <SkeletonImageCard />
      </li>
    ))}
  </ul>
)

const meta: Meta<typeof LoadingRegion> = {
  component: LoadingRegion,
  args: {
    loading: true,
    skeleton: placeholders,
    children: <p>Contenido cargado.</p>,
  },
}

export default meta

type Story = StoryObj<typeof LoadingRegion>

/** Busy: the placeholders show, and "Cargando…" is announced. */
export const Loading: Story = {}

/** Done: the content replaces the placeholders and the area is no longer busy. */
export const Loaded: Story = { args: { loading: false } }

/** With a label of its own, already translated. */
export const CustomLabel: Story = { args: { label: 'Cargando imágenes solares…' } }

/** The default label in English. */
export const English: Story = { globals: { locale: 'en' } }
