import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { GalleryGroupSection, type GalleryGroupSectionProps } from './GalleryGroupSection'
import { WithAlbumPage, WithoutSubAlbums } from './GalleryGroupSection.stories'

const groupArgs = WithAlbumPage.args as GalleryGroupSectionProps
const emptyArgs = WithoutSubAlbums.args as GalleryGroupSectionProps

describe('GalleryGroupSection', () => {
  test('names the group and summarises what it holds', () => {
    render(<GalleryGroupSection {...groupArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: groupArgs.group.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(groupArgs.group.description)).toBeInTheDocument()
    expect(screen.getAllByText(groupArgs.group.meta).length).toBeGreaterThan(0)
  })

  test('shows one tile per sub-album alongside the cover', () => {
    render(<GalleryGroupSection {...groupArgs} />)

    expect(screen.getByText('Cimentación e instalación de la antena')).toBeInTheDocument()
    expect(screen.getByText('Pruebas del receptor')).toBeInTheDocument()
    expect(screen.getByText('Alineación y calibración')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Construcción del ROSAC/ })).toHaveAttribute(
      'href',
      '/galeria/rosac',
    )
  })

  test('renders the cover on its own when the group has no sub-albums', () => {
    render(<GalleryGroupSection {...emptyArgs} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Portada del álbum')).toBeInTheDocument()
    expect(screen.queryByText('Portada del subálbum')).not.toBeInTheDocument()
  })
})
