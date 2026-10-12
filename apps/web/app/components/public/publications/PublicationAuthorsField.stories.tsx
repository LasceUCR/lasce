import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import {
  PublicationAuthorsField,
  type PublicationAuthorsFieldProps,
} from './PublicationAuthorsField'

/** Owns the list, as the publication form does. */
function Harness(props: PublicationAuthorsFieldProps) {
  const [authors, setAuthors] = useState(props.authors)
  return <PublicationAuthorsField {...props} authors={authors} onChange={setAuthors} />
}

const meta = {
  component: PublicationAuthorsField,
  render: (args) => <Harness {...args} />,
  args: { authors: [], onChange: () => {}, required: true },
} satisfies Meta<typeof PublicationAuthorsField>

export default meta
type Story = StoryObj<typeof meta>

/** No author yet. */
export const Empty: Story = {}

/** Up to three authors show in full. */
export const Few: Story = {
  args: { authors: ['Carolina Salas Matamoros', 'Karl Ludwig Klein'] },
}

/** Past three, the rest collapse behind "+N más". */
export const Many: Story = {
  args: {
    authors: [
      'David Michael Gale',
      'Carolina Salas Matamoros',
      'Miguel Velázquez',
      'Wagner Mejías',
      'Gustavo Lara',
      'Andrés Fallas',
    ],
  },
}

/** The form's error for the list, after trying to save without authors. */
export const WithError: Story = {
  args: { error: 'Debe existir al menos un autor.' },
}
