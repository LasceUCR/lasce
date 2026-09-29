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
  type GalleryAlbum,
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
    expect(subAlbumPath('rosac', 'fotogrametria')).toBe('/galeria/rosac/fotogrametria')
  })

  test('accepts only the known album slugs', () => {
    expect(isAlbumSlug('rosac')).toBe(true)
    expect(isAlbumSlug('album-inexistente')).toBe(false)
  })

  test('returns an album by slug and nothing for an unknown one', () => {
    expect(getAlbum('rosac')).toBe(galleryAlbums.rosac)
    expect(getAlbum('album-inexistente')).toBeNull()
  })

  test('returns a sub-album only under its own album', () => {
    expect(getSubAlbum('rosac', 'fotogrametria')?.title).toBe(
      'Trabajos de fotogrametría para calibrar la parábola',
    )
    expect(getSubAlbum('rosac', 'subalbum-inexistente')).toBeNull()
    expect(getSubAlbum('album-inexistente', 'fotogrametria')).toBeNull()
  })

  test('enumerates every album and sub-album pair for static generation', () => {
    const params = subAlbumParams()
    const expected = galleryAlbumList.reduce((total, album) => total + album.subAlbums.length, 0)

    expect(params).toHaveLength(expected)
    expect(params).toContainEqual({ slug: 'rosac', subalbum: 'fotogrametria' })
    expect(params.every(({ slug }) => isAlbumSlug(slug))).toBe(true)
  })

  test('counts an album own files plus everything in its sub-albums', () => {
    const rosac = galleryAlbums.rosac
    const inSubAlbums = rosac.subAlbums.reduce((total, sub) => total + sub.media.length, 0)

    expect(albumFileCount(rosac)).toBe(rosac.media.length + inSubAlbums)
  })

  test('builds the summary line from the files actually present', () => {
    expect(albumMeta(galleryAlbums.rosac)).toBe(
      `5 subálbumes · ${albumFileCount(galleryAlbums.rosac)} archivos · 2019–2023`,
    )
  })

  test('leaves the sub-album count out for an album that has none', () => {
    const standalone: GalleryAlbum = {
      slug: 'rosac-standalone',
      title: 'ROSAC',
      description: 'Observatorio',
      years: '2024',
      subAlbums: [],
      media: galleryAlbums.rosac.media,
    }

    expect(albumMeta(standalone)).toBe(`${galleryAlbums.rosac.media.length} archivos · 2024`)
    expect(albumMeta(standalone)).not.toContain('subálbumes')
  })

  test('counts the files shown on a single page', () => {
    expect(albumMediaMeta(galleryAlbums.rosac.media)).toBe('16 archivos en este álbum')
    expect(albumMediaMeta([])).toBe('0 archivos en este álbum')
  })

  test('tells video apart from photography in the placeholder caption', () => {
    const photo: GalleryMedia = {
      id: 'test-photo',
      title: 'Foto de prueba',
      description: 'Descripción',
      alt: 'Alt text.',
      date: '2024',
      format: 'JPG',
      uploader: 'LASCE',
      isVideo: false,
      colSpan: 1,
      rowSpan: 1,
    }
    const video: GalleryMedia = {
      ...photo,
      id: 'test-video',
      title: 'Video de prueba',
      isVideo: true,
    }

    expect(mediaPlaceholder(photo)).toMatch(/^Foto: /)
    expect(mediaPlaceholder(video)).toMatch(/^Video: /)
  })

  test('gives every album, sub-album and file a unique identifier', () => {
    const albumIds = galleryAlbumList.map((album) => album.slug)
    const mediaIds = everyMedia().map((item) => item.id)

    expect(new Set(albumIds).size).toBe(albumIds.length)
    expect(new Set(mediaIds).size).toBe(mediaIds.length)
    expect(albumIds).toEqual([...albumSlugs])
  })

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

  test('describes every media entry for anyone who cannot see it', () => {
    const undescribed = everyMedia().filter((item) => item.alt.trim() === '')

    expect(undescribed).toEqual([])
  })

  test('describes each image instead of repeating its title or caption', () => {
    const normalise = (value: string) => value.trim().replace(/.$/, '').toLowerCase()
    const echoes = everyMedia().filter(
      (item) =>
        normalise(item.alt) === normalise(item.title) ||
        normalise(item.alt) === normalise(item.description),
    )

    expect(echoes).toEqual([])
  })

  test('never opens alt text with a redundant "imagen de"', () => {
    const redundant = everyMedia().filter((item) =>
      /^(una vista de|foto|imagen|fotograf)/i.test(item.alt),
    )

    expect(redundant).toEqual([])
  })

  test('describes a shared image file identically wherever it appears', () => {
    const byFile = new Map<string, Set<string>>()

    for (const item of everyMedia()) {
      if (item.src === undefined) continue
      const alts = byFile.get(item.src) ?? new Set<string>()
      alts.add(item.alt)
      byFile.set(item.src, alts)
    }

    const contradictory = [...byFile.entries()]
      .filter(([, alts]) => alts.size > 1)
      .map(([src]) => src)

    expect(contradictory).toEqual([])
    expect(byFile.size).toBeGreaterThan(0)
  })
})
