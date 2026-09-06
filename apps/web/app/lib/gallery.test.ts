import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import {
  albumFileCount,
  albumMediaMeta,
  albumMeta,
  albumPath,
  albumSlugs,
  galleryAlbumList,
  galleryAlbums,
  getAlbum,
  getSubAlbum,
  isAlbumSlug,
  mediaPlaceholder,
  subAlbumParams,
  subAlbumPath,
  type GalleryMedia,
} from './gallery'

// Vitest runs with apps/web as its working directory.
const publicDir = join(process.cwd(), 'public')

function everyMedia(): GalleryMedia[] {
  return galleryAlbumList.flatMap((album) => [
    ...album.media,
    ...album.subAlbums.flatMap((subAlbum) => [...subAlbum.media]),
  ])
}

describe('gallery', () => {
  test('builds a public path for an album and for a sub-album', () => {
    expect(albumPath('rosac')).toBe('/galeria/rosac')
    expect(subAlbumPath('rosac', 'cimentacion')).toBe('/galeria/rosac/cimentacion')
  })

  test('accepts only the known album slugs', () => {
    expect(isAlbumSlug('rosac')).toBe(true)
    expect(isAlbumSlug('album-inexistente')).toBe(false)
  })

  test('returns an album by slug and nothing for an unknown one', () => {
    expect(getAlbum('eclipse')).toBe(galleryAlbums.eclipse)
    expect(getAlbum('album-inexistente')).toBeNull()
  })

  test('returns a sub-album only under its own album', () => {
    expect(getSubAlbum('rosac', 'receptor')?.title).toBe('Pruebas del receptor')
    expect(getSubAlbum('rosac', 'visitas')).toBeNull()
    expect(getSubAlbum('album-inexistente', 'receptor')).toBeNull()
  })

  test('enumerates every album and sub-album pair for static generation', () => {
    const params = subAlbumParams()
    const expected = galleryAlbumList.reduce((total, album) => total + album.subAlbums.length, 0)

    expect(params).toHaveLength(expected)
    expect(params).toContainEqual({ slug: 'laboratorio', subalbum: 'talleres' })
    expect(params.every(({ slug }) => isAlbumSlug(slug))).toBe(true)
  })

  test('counts an album own files plus everything in its sub-albums', () => {
    const rosac = galleryAlbums.rosac
    const inSubAlbums = rosac.subAlbums.reduce((total, sub) => total + sub.media.length, 0)

    expect(albumFileCount(rosac)).toBe(rosac.media.length + inSubAlbums)
    expect(albumFileCount(galleryAlbums.eclipse)).toBe(galleryAlbums.eclipse.media.length)
  })

  test('builds the summary line from the files actually present', () => {
    expect(albumMeta(galleryAlbums.rosac)).toBe(
      `3 subálbumes · ${albumFileCount(galleryAlbums.rosac)} archivos · 2025–2026`,
    )
  })

  test('leaves the sub-album count out for an album that has none', () => {
    expect(albumMeta(galleryAlbums.eclipse)).toBe(
      `${galleryAlbums.eclipse.media.length} archivos · abril 2026`,
    )
    expect(albumMeta(galleryAlbums.eclipse)).not.toContain('subálbumes')
  })

  test('counts the files shown on a single page', () => {
    expect(albumMediaMeta(galleryAlbums.rosac.media)).toBe('13 archivos en este álbum')
  })

  test('tells video apart from photography in the placeholder caption', () => {
    const media = everyMedia()
    const photo = media.find((item) => !item.isVideo)
    const video = media.find((item) => item.isVideo)

    expect(photo && mediaPlaceholder(photo)).toMatch(/^Foto: /)
    expect(video && mediaPlaceholder(video)).toMatch(/^Video: /)
  })

  test('gives every album, sub-album and file a unique identifier', () => {
    const albumIds = galleryAlbumList.map((album) => album.slug)
    const mediaIds = everyMedia().map((item) => item.id)

    expect(new Set(albumIds).size).toBe(albumIds.length)
    expect(new Set(mediaIds).size).toBe(mediaIds.length)
    expect(albumIds).toEqual([...albumSlugs])
  })

  // The images are placeholders shared across albums, so a rename is easy to
  // miss. Fail here rather than shipping a broken tile.
  test('points every image at a file that exists under public/', () => {
    const covers = galleryAlbumList.flatMap((album) => [
      album.src,
      ...album.subAlbums.map((subAlbum) => subAlbum.src),
    ])
    const sources = [...covers, ...everyMedia().map((item) => item.src)].filter(
      (src): src is string => src !== undefined,
    )

    expect(sources.length).toBeGreaterThan(0)

    const missing = sources.filter((src) => !existsSync(join(publicDir, src)))

    expect(missing).toEqual([])
  })

  test('gives every media entry an image', () => {
    expect(everyMedia().filter((item) => item.src === undefined)).toEqual([])
  })
})
