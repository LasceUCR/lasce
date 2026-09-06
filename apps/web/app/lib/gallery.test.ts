import { describe, expect, test } from 'vitest'

import {
  albumMediaMeta,
  albumPath,
  albumSlugs,
  galleryAlbums,
  galleryGroups,
  getAlbum,
  isAlbumSlug,
  mediaPlaceholder,
  type GalleryGroup,
  type GalleryMedia,
} from './gallery'

describe('gallery', () => {
  test('builds a public path for each album slug', () => {
    expect(albumPath('rosac')).toBe('/galeria/rosac')
  })

  test('accepts only the known album slugs', () => {
    expect(isAlbumSlug('rosac')).toBe(true)
    expect(isAlbumSlug('album-inexistente')).toBe(false)
  })

  test('returns an album by slug and nothing for an unknown one', () => {
    expect(getAlbum('rosac')).toBe(galleryAlbums.rosac)
    expect(getAlbum('album-inexistente')).toBeNull()
  })

  test('only links the groups whose album has a page', () => {
    const groups: readonly GalleryGroup[] = galleryGroups
    const linked = groups.filter((group) => group.albumSlug !== undefined)

    expect(linked.map((group) => group.albumSlug)).toEqual([...albumSlugs])
    for (const group of linked) {
      expect(isAlbumSlug(group.albumSlug ?? '')).toBe(true)
    }
  })

  test('counts the files an album holds directly', () => {
    expect(albumMediaMeta(galleryAlbums.rosac)).toBe('13 archivos en este álbum')
  })

  test('tells video apart from photography in the placeholder caption', () => {
    const media: readonly GalleryMedia[] = galleryAlbums.rosac.media
    const photo = media.find((item) => !item.isVideo)
    const video = media.find((item) => item.isVideo)

    expect(photo && mediaPlaceholder(photo)).toBe('Foto: Llegada de los componentes del ROSAC')
    expect(video && mediaPlaceholder(video)).toBe('Video: Ensamblaje del reflector parabólico')
  })
})
