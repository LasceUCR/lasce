import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import type { ConstructionStage } from '@/app/lib/rosac-construction'
import { rosacInfoContent, type RosacInfoContent } from '@/app/lib/rosac'
import en from '@/messages/en.json'

import { RosacInfoPage } from './RosacInfoPage'

const editModeRosacContent: RosacInfoContent = {
  ...rosacInfoContent,
  characteristics: {
    ...rosacInfoContent.characteristics,
    items: rosacInfoContent.characteristics.items.map((item) => {
      const enItem =
        en.rosac.characteristics.items[item.id as keyof typeof en.rosac.characteristics.items]
      return {
        ...item,
        editing: {
          content: {
            es: { title: item.title, description: item.description },
            en: enItem ? { title: enItem.title, description: enItem.description } : null,
          },
          isLegacy: false,
          version: '1',
        },
      }
    }),
  },
  activities: {
    ...rosacInfoContent.activities,
    items: rosacInfoContent.activities.items.map((item) => {
      const enItem = en.rosac.activities.items[item.id as keyof typeof en.rosac.activities.items]
      return {
        ...item,
        editing: {
          content: {
            es: { title: item.title, description: item.description },
            en: enItem ? { title: enItem.title, description: enItem.description } : null,
          },
          isLegacy: false,
          version: '1',
        },
      }
    }),
  },
  construction: {
    ...rosacInfoContent.construction,
    stages: rosacInfoContent.construction.stages.map((stage) => {
      const enStage =
        en.rosac.construction.stages[stage.id as keyof typeof en.rosac.construction.stages]
      return {
        ...stage,
        editing: {
          content: {
            es: { title: stage.title, description: stage.description },
            en: enStage ? { title: enStage.title, description: enStage.description } : null,
          },
          isLegacy: false,
          version: '1',
        },
      }
    }) as unknown as readonly [ConstructionStage, ...ConstructionStage[]],
  },
  instruments: {
    ...rosacInfoContent.instruments,
    items: rosacInfoContent.instruments.items.map((item, index) => {
      const enNames = ['ROSAC-SABER', 'ROSAC-MIRA 9GHz', 'ROSAC-HIROS']
      const enDescs = [
        'Band between 100 and 1000 MHz',
        '9 GHz band',
        'Neutral hydrogen observation at 1.4 GHz',
      ]
      return {
        ...item,
        editing: {
          content: {
            es: {
              name: item.name,
              description: item.characteristics?.[0] ?? '',
            },
            en: {
              name: enNames[index] ?? item.name,
              description: enDescs[index] ?? item.characteristics?.[0] ?? '',
            },
          },
          isLegacy: false,
          version: '1',
        },
      }
    }),
  },
}

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

export const EditMode: Story = {
  args: {
    content: editModeRosacContent,
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
