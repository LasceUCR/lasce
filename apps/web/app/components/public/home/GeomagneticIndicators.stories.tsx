import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { editableIndicators, publicIndicators } from './fixtures'
import { GeomagneticIndicators } from './GeomagneticIndicators'

const meta: Meta<typeof GeomagneticIndicators> = {
  component: GeomagneticIndicators,
  parameters: { nextjs: { appDirectory: true } },
}

export default meta

type Story = StoryObj<typeof GeomagneticIndicators>

function withEditMode(editMode: boolean): NonNullable<Story['decorators']> {
  return [
    (Story) => (
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ]
}

const common = {
  title: 'Índices geomagnéticos de Costa Rica',
  demoNotice: 'Datos de demostración',
}

/** What a visitor sees. */
export const ViewMode: Story = {
  args: { ...common, indicators: publicIndicators },
  decorators: withEditMode(false),
}

/** "Modo edición": each card can be edited and dragged by its handle, or moved with the keyboard. */
export const EditModeOn: Story = {
  args: { ...common, indicators: editableIndicators, canEdit: true },
  decorators: withEditMode(true),
}

/** Nothing stored yet: the catalogue's indices, read-only even in edit mode. */
export const CatalogueFallback: Story = {
  args: {
    ...common,
    canEdit: true,
    indicators: publicIndicators.map(({ contentLocale: _locale, ...indicator }) => indicator),
  },
  decorators: withEditMode(true),
}
