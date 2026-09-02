import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { LucideIcon } from 'lucide-react'

import type { WorkAreaItem } from './WorkAreasSection'
import { WorkAreasSection } from './WorkAreasSection'
import { getHomeAreaCards, workAreasSectionId, type AreaCardDefinition } from '@/app/lib/work-areas'

function toWorkAreaItems(areas: AreaCardDefinition[]): WorkAreaItem[] {
  return areas.map((area) => {
    const AreaIcon: LucideIcon = area.icon

    return {
      title: area.title,
      description: area.description,
      href: area.href,
      icon: <AreaIcon size={25} strokeWidth={1.7} />,
    }
  })
}

const meta: Meta<typeof WorkAreasSection> = {
  component: WorkAreasSection,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof WorkAreasSection>

export const Default: Story = {
  args: {
    id: workAreasSectionId,
    title: 'Áreas y accesos principales',
    subtitle: 'Investigar, observar, analizar y compartir.',
    areas: toWorkAreaItems(getHomeAreaCards()),
  },
}

export const Empty: Story = {
  args: {
    title: 'Áreas y accesos principales',
    subtitle: 'Investigar, observar, analizar y compartir.',
    areas: [],
  },
}
