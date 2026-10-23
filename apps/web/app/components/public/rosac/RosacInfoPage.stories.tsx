import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { rosacInfoContent } from '@/app/lib/rosac'

import { RosacInfoPage } from './RosacInfoPage'

const meta: Meta<typeof RosacInfoPage> = {
  component: RosacInfoPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <EditModeProvider>
        <Story />
      </EditModeProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof RosacInfoPage>

export const Default: Story = {
  args: { content: rosacInfoContent },
}

export const EmptyResearchers: Story = {
  args: {
    content: {
      ...rosacInfoContent,
      team: { ...rosacInfoContent.team, people: [] },
    },
  },
}

const editModeContent = {
  ...rosacInfoContent,
  characteristics: {
    ...rosacInfoContent.characteristics,
    items: rosacInfoContent.characteristics.items.map((item) => ({
      ...item,
      editing: {
        content: {
          es: { title: item.title, description: item.description },
          en: { title: item.title, description: item.description },
        },
        isLegacy: false,
        version: '1',
      },
    })),
  },
  activities: {
    ...rosacInfoContent.activities,
    items: rosacInfoContent.activities.items.map((item) => ({
      ...item,
      editing: {
        content: {
          es: { title: item.title, description: item.description },
          en: { title: item.title, description: item.description },
        },
        isLegacy: false,
        version: '1',
      },
    })),
  },
  construction: {
    ...rosacInfoContent.construction,
    stages: rosacInfoContent.construction.stages.map((stage) => ({
      ...stage,
      editing: {
        content: {
          es: { title: stage.title, description: stage.description },
          en: { title: stage.title, description: stage.description },
        },
        isLegacy: false,
        version: '1',
      },
    })) as unknown as typeof rosacInfoContent.construction.stages,
  },
  instruments: {
    ...rosacInfoContent.instruments,
    items: rosacInfoContent.instruments.items.map((item) => ({
      ...item,
      editing: {
        content: {
          es: {
            name: item.name,
            description: item.consultation?.notice ?? item.pendingMessage ?? '',
          },
          en: {
            name: item.name,
            description: item.consultation?.notice ?? item.pendingMessage ?? '',
          },
        },
        isLegacy: false,
        version: '1',
      },
    })),
  },
  team: {
    ...rosacInfoContent.team,
    people: rosacInfoContent.team.people.map((person) => ({
      ...person,
      editing: {
        content: {
          es: { role: person.role, description: person.description ?? null },
          en: { role: person.role, description: person.description ?? null },
        },
        isLegacy: false,
        version: '1',
      },
    })),
  },
  acknowledgments: {
    ...rosacInfoContent.acknowledgments,
    institutions: rosacInfoContent.acknowledgments.institutions.map((inst) => ({
      ...inst,
      editing: {
        content: {
          es: { name: inst.name },
          en: { name: inst.name },
        },
        isLegacy: false,
        version: '1',
      },
    })),
  },
}

export const EditMode: Story = {
  args: {
    content: editModeContent,
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

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'rosacMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        rosacMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
