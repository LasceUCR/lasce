import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryAlbumAddCard } from './GalleryAlbumAddCard'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

const meta: Meta<typeof GalleryAlbumAddCard> = {
  component: GalleryAlbumAddCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => undefined }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof GalleryAlbumAddCard>

export const Available: Story = {
  args: { canCreate: true },
}
