import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInfoContent } from '@/app/lib/rosac'

import { ResearcherCard } from './ResearcherCard'

const meta: Meta<typeof ResearcherCard> = {
  component: ResearcherCard,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearcherCard>

const carolina = rosacInfoContent.team.people[0]
const jelmuth = rosacInfoContent.team.people.find((person) => person.name === 'Jelmuth Rojas')!

export const Default: Story = {
  args: { ...carolina },
}

export const WithoutEmail: Story = {
  args: { ...jelmuth },
}

export const WithoutDescription: Story = {
  args: { ...jelmuth, description: undefined },
}

/** A bilingual roster (`/nosotros`) marks the language of the role and description. */
export const WithContentLang: Story = {
  args: { ...carolina, contentLang: 'es' },
}

/** The text of a legacy record is in an unknown language, so its `lang` is empty. */
export const WithUnknownContentLang: Story = {
  args: { ...carolina, contentLang: '' },
}

/** A researcher saved without a photo shows the default portrait. */
export const WithoutPhoto: Story = {
  args: { ...carolina, src: '' },
}
