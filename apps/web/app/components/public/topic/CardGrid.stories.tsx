import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CardGrid } from './CardGrid'
import { InfoCard, type InfoCardProps } from './InfoCard'
import { Default as DefaultCard, HorizontalWithAction } from './InfoCard.stories'

const meta: Meta<typeof CardGrid> = {
  component: CardGrid,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof CardGrid>

export const Default: Story = {
  args: {
    columns: 2,
    children: <InfoCard {...(DefaultCard.args as InfoCardProps)} />,
  },
}

export const SingleColumn: Story = {
  args: {
    columns: 1,
    children: <InfoCard {...(HorizontalWithAction.args as InfoCardProps)} />,
  },
}
