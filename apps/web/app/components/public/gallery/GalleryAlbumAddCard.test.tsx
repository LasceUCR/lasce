import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { GalleryAlbumAddCard, type GalleryAlbumAddCardProps } from './GalleryAlbumAddCard'
import { Available } from './GalleryAlbumAddCard.stories'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

const defaultArgs = Available.args as GalleryAlbumAddCardProps

function renderCard(props: GalleryAlbumAddCardProps = defaultArgs, editMode = true) {
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => undefined }}>
      <GalleryAlbumAddCard {...props} />
    </EditModeContext.Provider>,
  )
}

describe('GalleryAlbumAddCard', () => {
  test('shows the add-album prompt when edit mode and permission are enabled', () => {
    renderCard()

    expect(screen.getByRole('button', { name: 'Añadir álbum' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  test('does not render without create permission', () => {
    renderCard({ canCreate: false })

    expect(screen.queryByRole('button', { name: 'Añadir álbum' })).not.toBeInTheDocument()
  })

  test('opens the simple create modal and closes it from its button', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Añadir álbum' }))

    expect(screen.getByRole('dialog', { name: 'Añadir álbum' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear álbum' }))

    expect(screen.queryByRole('dialog', { name: 'Añadir álbum' })).not.toBeInTheDocument()
  })

  test('does not render outside edit mode', () => {
    renderCard(defaultArgs, false)

    expect(screen.queryByRole('button', { name: 'Añadir álbum' })).not.toBeInTheDocument()
  })
})
