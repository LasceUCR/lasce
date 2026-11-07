import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { researchAreas } from '@/app/lib/research-areas'

import { bilingualArea, legacyArea } from './fixtures'
import { ResearchAreasSection } from './ResearchAreasSection'

const meta: Meta<typeof ResearchAreasSection> = {
  component: ResearchAreasSection,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
}

export default meta

type Story = StoryObj<typeof ResearchAreasSection>

// The fixture areas in Spanish, as a visitor sees them. The page itself reads the areas from the
// database, in the language chosen in the header.
export const Default: Story = {
  args: {
    id: 'research-areas',
    areas: researchAreas,
  },
}

export const Empty: Story = {
  args: {
    id: 'research-areas-empty',
    areas: [],
  },
}

/** "Modo edición" for an administrator: one complete area and one without its English yet. */
export const EditMode: Story = {
  args: {
    id: 'research-areas-edit',
    areas: [bilingualArea, legacyArea],
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export const SecondPage: Story = {
  args: {
    ...Default.args,
    label: 'Áreas de investigación',
    areas: Array.from({ length: 10 }, (_, index) => ({
      ...researchAreas[0]!,
      id: `area-${index + 11}`,
      title: `Área ${index + 11}`,
    })),
    page: 2,
    totalItems: 23,
    totalPages: 3,
  },
}

export const LastPage: Story = {
  args: { ...SecondPage.args, areas: SecondPage.args!.areas!.slice(0, 3), page: 3 },
}
