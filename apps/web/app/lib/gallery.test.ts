import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, test, vi } from 'vitest'

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
  createGalleryMedia,
  deleteGalleryAlbum,
  deleteGalleryMedia,
  createGallerySubAlbum,
  createTopLevelGalleryAlbum,
  getGalleryAlbums,
  galleryAlbumUpdateSchema,
  galleryMediaInputSchema,
  galleryMediaUpdateSchema,
  gallerySubAlbumInputSchema,
  galleryTopLevelAlbumInputSchema,
  updateGalleryMedia,
  updateGalleryAlbum,
  type GalleryAlbum,
  type GalleryMedia,
} from './gallery'

const mocks = vi.hoisted(() => ({
  galleryAlbumCreate: vi.fn(),
  galleryAlbumFindUnique: vi.fn(),
  galleryAlbumFindMany: vi.fn(),
  galleryAlbumDeleteMany: vi.fn(),
  galleryAlbumUpdate: vi.fn(),
  galleryMediaCreate: vi.fn(),
  galleryMediaFindFirst: vi.fn(),
  galleryMediaDeleteMany: vi.fn(),
  galleryMediaUpdate: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: {
    galleryAlbum: {
      create: mocks.galleryAlbumCreate,
      findUnique: mocks.galleryAlbumFindUnique,
      findMany: mocks.galleryAlbumFindMany,
      deleteMany: mocks.galleryAlbumDeleteMany,
      update: mocks.galleryAlbumUpdate,
    },
    galleryMedia: {
      create: mocks.galleryMediaCreate,
      findFirst: mocks.galleryMediaFindFirst,
      deleteMany: mocks.galleryMediaDeleteMany,
      update: mocks.galleryMediaUpdate,
    },
  },
}))

const albumId = '39bf18d8-e9ab-44c9-9043-71121c3bc2d9'
const parentAlbumId = 'd373bcfb-dd4c-486d-a6f2-a5282d8bc65e'
const topLevelInput = {
  slug: 'rosac',
  title: 'ROSAC',
  description: 'Construcción y desarrollo del observatorio.',
}
const subAlbumInput = {
  slug: 'cimentacion',
  title: 'Cimentación',
  description: 'Construcción de la base.',
}

afterEach(() => {
  vi.clearAllMocks()
})

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

describe('gallery management input schemas', () => {
  test('validates top-level albums and URL-safe slugs', () => {
    expect(galleryTopLevelAlbumInputSchema.safeParse(topLevelInput).success).toBe(true)
    expect(
      galleryTopLevelAlbumInputSchema.safeParse({ ...topLevelInput, slug: 'Álbum ROSAC' }).success,
    ).toBe(false)
  })

  test('validates sub-album content', () => {
    expect(gallerySubAlbumInputSchema.safeParse(subAlbumInput).success).toBe(true)
  })

  test('accepts partial album updates, including clearing nullable fields', () => {
    expect(galleryAlbumUpdateSchema.parse({ title: ' Nuevo título ' })).toEqual({
      title: 'Nuevo título',
    })
    expect(galleryAlbumUpdateSchema.parse({ yearsLabel: null, coverObjectKey: null })).toEqual({
      yearsLabel: null,
      coverObjectKey: null,
    })
    expect(galleryAlbumUpdateSchema.safeParse({}).success).toBe(false)
    expect(galleryAlbumUpdateSchema.safeParse({ parentAlbumId: null }).success).toBe(false)
  })

  test('validates media metadata and applies display defaults', () => {
    expect(
      galleryMediaInputSchema.parse({
        title: ' Foto ',
        description: ' Descripción ',
        alt: ' Texto alternativo ',
        objectKey: ' assets/foto.jpg ',
        format: ' JPG ',
        date: '2026-02-16',
        uploader: ' LASCE ',
      }),
    ).toEqual({
      title: 'Foto',
      description: 'Descripción',
      alt: 'Texto alternativo',
      objectKey: 'assets/foto.jpg',
      format: 'JPG',
      isVideo: false,
      colSpan: 1,
      rowSpan: 1,
      date: '2026-02-16',
      uploader: 'LASCE',
    })
    expect(
      galleryMediaInputSchema.safeParse({
        title: 'Foto',
        description: 'Descripción',
        alt: 'Texto alternativo',
        objectKey: 'assets/foto.jpg',
        format: 'JPG',
        date: '2026-02-30',
        uploader: 'LASCE',
      }).success,
    ).toBe(false)
  })

  test('accepts partial media updates but rejects empty or invalid updates', () => {
    expect(galleryMediaUpdateSchema.parse({ title: ' Nuevo título ' })).toEqual({
      title: 'Nuevo título',
    })
    expect(galleryMediaUpdateSchema.safeParse({}).success).toBe(false)
    expect(galleryMediaUpdateSchema.safeParse({ rowSpan: 5 }).success).toBe(false)
  })
})

describe('getGalleryAlbums', () => {
  test('maps database albums, sub-albums, and media to the public gallery shape', async () => {
    const capturedAt = new Date('2026-02-16T00:00:00.000Z')
    mocks.galleryAlbumFindMany.mockResolvedValue([
      {
        id: 'album-id',
        slug: 'rosac',
        title: 'Fotos ROSAC',
        description: 'Documentación del observatorio.',
        yearsLabel: '2025–2026',
        coverObjectKey: '/images/galeria/rosac-cover.jpg',
        media: [
          {
            id: 'media-id',
            title: 'Montaje',
            description: 'Montaje del reflector.',
            altText: 'Reflector durante el montaje.',
            objectKey: '/images/galeria/montaje.jpg',
            format: 'JPG',
            isVideo: false,
            colSpan: 2,
            rowSpan: 1,
            capturedAt,
            uploaderName: 'LASCE',
          },
        ],
        subAlbums: [
          {
            id: 'subalbum-id',
            slug: 'montaje',
            title: 'Montaje',
            description: 'Trabajos de montaje.',
            coverObjectKey: '/images/galeria/montaje-cover.jpg',
            media: [],
          },
        ],
      },
    ])

    await expect(getGalleryAlbums()).resolves.toEqual([
      {
        id: 'album-id',
        slug: 'rosac',
        title: 'Fotos ROSAC',
        description: 'Documentación del observatorio.',
        years: '2025–2026',
        coverObjectKey: '/images/galeria/rosac-cover.jpg',
        src: '/images/galeria/rosac-cover.jpg',
        media: [
          {
            id: 'media-id',
            title: 'Montaje',
            description: 'Montaje del reflector.',
            alt: 'Reflector durante el montaje.',
            date: '2026-02-16',
            format: 'JPG',
            uploader: 'LASCE',
            isVideo: false,
            colSpan: 2,
            rowSpan: 1,
            objectKey: '/images/galeria/montaje.jpg',
            src: '/images/galeria/montaje.jpg',
          },
        ],
        subAlbums: [
          {
            id: 'subalbum-id',
            slug: 'montaje',
            title: 'Montaje',
            description: 'Trabajos de montaje.',
            coverObjectKey: '/images/galeria/montaje-cover.jpg',
            src: '/images/galeria/montaje-cover.jpg',
            media: [],
          },
        ],
      },
    ])
    expect(mocks.galleryAlbumFindMany).toHaveBeenCalledWith({
      where: { parentAlbumId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        media: { orderBy: { position: 'asc' } },
        subAlbums: {
          orderBy: { createdAt: 'asc' },
          include: { media: { orderBy: { position: 'asc' } } },
        },
      },
    })
  })

  test('rejects stored media tile spans that cannot be rendered', async () => {
    mocks.galleryAlbumFindMany.mockResolvedValue([
      {
        id: 'album-id',
        slug: 'rosac',
        title: 'Fotos ROSAC',
        description: 'Documentación del observatorio.',
        yearsLabel: null,
        coverObjectKey: null,
        subAlbums: [],
        media: [
          {
            id: 'media-id',
            title: 'Montaje',
            description: 'Montaje del reflector.',
            altText: 'Reflector durante el montaje.',
            objectKey: 'gallery/montaje.jpg',
            format: 'JPG',
            isVideo: false,
            colSpan: 0,
            rowSpan: 1,
            capturedAt: new Date('2026-02-16T00:00:00.000Z'),
            uploaderName: 'LASCE',
          },
        ],
      },
    ])

    await expect(getGalleryAlbums()).rejects.toThrow(
      'Gallery media media-id has invalid colSpan: 0',
    )
  })
})

describe('createTopLevelGalleryAlbum', () => {
  test('creates a top-level album without a section relation', async () => {
    const album = { id: parentAlbumId, ...topLevelInput, parentAlbumId: null }
    mocks.galleryAlbumCreate.mockResolvedValue(album)

    await expect(createTopLevelGalleryAlbum(topLevelInput)).resolves.toEqual({ ok: true, album })
    expect(mocks.galleryAlbumCreate).toHaveBeenCalledWith({
      data: {
        ...topLevelInput,
        yearsLabel: null,
        coverObjectKey: null,
        parentAlbumId: null,
      },
    })
  })

  test('retries a duplicate slug once with a UUID suffix', async () => {
    const album = { id: parentAlbumId, ...topLevelInput, parentAlbumId: null }
    mocks.galleryAlbumCreate.mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValueOnce(album)

    await expect(createTopLevelGalleryAlbum(topLevelInput)).resolves.toEqual({ ok: true, album })
    expect(mocks.galleryAlbumCreate).toHaveBeenNthCalledWith(1, {
      data: {
        ...topLevelInput,
        yearsLabel: null,
        coverObjectKey: null,
        parentAlbumId: null,
      },
    })
    const retryData = mocks.galleryAlbumCreate.mock.calls[1]?.[0].data
    expect(retryData).toMatchObject({
      title: topLevelInput.title,
      description: topLevelInput.description,
      yearsLabel: null,
      coverObjectKey: null,
      parentAlbumId: null,
    })
    expect(retryData.slug).toMatch(
      /^rosac-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  test('reports a conflict if the UUID-suffixed slug also exists', async () => {
    mocks.galleryAlbumCreate
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockRejectedValueOnce({ code: 'P2002' })

    await expect(createTopLevelGalleryAlbum(topLevelInput)).resolves.toEqual({
      ok: false,
      reason: 'duplicate-slug',
    })
    expect(mocks.galleryAlbumCreate).toHaveBeenCalledTimes(2)
  })
})

describe('updateGalleryAlbum', () => {
  test('updates only provided album fields', async () => {
    const album = {
      id: albumId,
      slug: 'rosac',
      title: 'Título actualizado',
      description: 'Descripción original.',
      yearsLabel: '2025–2026',
      coverObjectKey: null,
      parentAlbumId: null,
    }
    mocks.galleryAlbumUpdate.mockResolvedValue(album)

    await expect(updateGalleryAlbum(albumId, { title: 'Título actualizado' })).resolves.toEqual({
      ok: true,
      album,
    })
    expect(mocks.galleryAlbumUpdate).toHaveBeenCalledWith({
      where: { id: albumId },
      data: { title: 'Título actualizado' },
    })
  })

  test('maps missing album and duplicate slug errors', async () => {
    mocks.galleryAlbumUpdate.mockRejectedValueOnce({ code: 'P2025' })
    await expect(updateGalleryAlbum(albumId, { title: 'Título' })).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    })

    mocks.galleryAlbumUpdate.mockRejectedValueOnce({ code: 'P2002' })
    await expect(updateGalleryAlbum(albumId, { slug: 'otro-album' })).resolves.toEqual({
      ok: false,
      reason: 'duplicate-slug',
    })
  })
})

describe('deleteGalleryAlbum', () => {
  test('deletes the album database record and returns true', async () => {
    mocks.galleryAlbumDeleteMany.mockResolvedValue({ count: 1 })

    await expect(deleteGalleryAlbum(albumId)).resolves.toBe(true)
    expect(mocks.galleryAlbumDeleteMany).toHaveBeenCalledWith({ where: { id: albumId } })
  })

  test('returns false when the album does not exist', async () => {
    mocks.galleryAlbumDeleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteGalleryAlbum('missing-id')).resolves.toBe(false)
  })
})

describe('createGallerySubAlbum', () => {
  test('creates a sub-album linked to its top-level parent', async () => {
    const album = { id: 'sub-1', ...subAlbumInput, parentAlbumId }
    mocks.galleryAlbumFindUnique.mockResolvedValue({
      id: parentAlbumId,
      parentAlbumId: null,
    })
    mocks.galleryAlbumCreate.mockResolvedValue(album)

    await expect(createGallerySubAlbum(parentAlbumId, subAlbumInput)).resolves.toEqual({
      ok: true,
      album,
    })
    expect(mocks.galleryAlbumCreate).toHaveBeenCalledWith({
      data: {
        ...subAlbumInput,
        yearsLabel: null,
        coverObjectKey: null,
        parentAlbumId,
      },
    })
  })

  describe('createGalleryMedia', () => {
    const input = {
      title: 'Montaje',
      description: 'Montaje del reflector.',
      alt: 'Reflector durante el montaje.',
      objectKey: 'gallery/montaje.jpg',
      format: 'JPG',
      isVideo: false,
      colSpan: 2 as const,
      rowSpan: 1 as const,
      date: '2026-02-16',
      uploader: 'LASCE',
    }

    test('creates media at the next album position and maps it to gallery fields', async () => {
      mocks.galleryAlbumFindUnique.mockResolvedValue({ id: albumId })
      mocks.galleryMediaFindFirst.mockResolvedValue({ position: 3 })
      const capturedAt = new Date('2026-02-16T00:00:00.000Z')
      mocks.galleryMediaCreate.mockResolvedValue({
        id: 'media-id',
        title: input.title,
        description: input.description,
        altText: input.alt,
        objectKey: input.objectKey,
        format: input.format,
        isVideo: input.isVideo,
        colSpan: input.colSpan,
        rowSpan: input.rowSpan,
        capturedAt,
        uploaderName: input.uploader,
      })

      await expect(createGalleryMedia(albumId, input)).resolves.toEqual({
        ok: true,
        media: {
          id: 'media-id',
          title: input.title,
          description: input.description,
          alt: input.alt,
          objectKey: input.objectKey,
          format: input.format,
          isVideo: false,
          colSpan: 2,
          rowSpan: 1,
          date: '2026-02-16',
          uploader: input.uploader,
        },
      })
      expect(mocks.galleryMediaCreate).toHaveBeenCalledWith({
        data: {
          albumId,
          title: input.title,
          description: input.description,
          altText: input.alt,
          objectKey: input.objectKey,
          format: input.format,
          isVideo: input.isVideo,
          colSpan: input.colSpan,
          rowSpan: input.rowSpan,
          capturedAt,
          uploaderName: input.uploader,
          position: 4,
        },
      })
    })

    test('reports a missing album and a unique-key conflict', async () => {
      mocks.galleryAlbumFindUnique.mockResolvedValue(null)
      await expect(createGalleryMedia(albumId, input)).resolves.toEqual({
        ok: false,
        reason: 'album-not-found',
      })
      expect(mocks.galleryMediaCreate).not.toHaveBeenCalled()

      mocks.galleryAlbumFindUnique.mockResolvedValue({ id: albumId })
      mocks.galleryMediaFindFirst.mockResolvedValue(null)
      mocks.galleryMediaCreate.mockRejectedValue({ code: 'P2002' })
      await expect(createGalleryMedia(albumId, input)).resolves.toEqual({
        ok: false,
        reason: 'conflict',
      })
    })
  })

  describe('deleteGalleryMedia', () => {
    test('deletes only the matching database record', async () => {
      mocks.galleryMediaDeleteMany.mockResolvedValue({ count: 1 })

      await expect(deleteGalleryMedia('media-id')).resolves.toBe(true)
      expect(mocks.galleryMediaDeleteMany).toHaveBeenCalledWith({ where: { id: 'media-id' } })
    })

    test('returns false when no matching record exists', async () => {
      mocks.galleryMediaDeleteMany.mockResolvedValue({ count: 0 })

      await expect(deleteGalleryMedia('missing-id')).resolves.toBe(false)
    })
  })

  test('rejects a missing or nested parent without creating an album', async () => {
    mocks.galleryAlbumFindUnique.mockResolvedValue(null)
    await expect(createGallerySubAlbum(parentAlbumId, subAlbumInput)).resolves.toEqual({
      ok: false,
      reason: 'parent-not-found',
    })

    mocks.galleryAlbumFindUnique.mockResolvedValue({
      id: parentAlbumId,
      parentAlbumId: 'another-parent',
    })
    await expect(createGallerySubAlbum(parentAlbumId, subAlbumInput)).resolves.toEqual({
      ok: false,
      reason: 'parent-not-top-level',
    })
    expect(mocks.galleryAlbumCreate).not.toHaveBeenCalled()
  })
})

describe('updateGalleryMedia', () => {
  test('updates supplied fields and returns mapped gallery media', async () => {
    const capturedAt = new Date('2026-02-16T00:00:00.000Z')
    mocks.galleryMediaUpdate.mockResolvedValue({
      id: 'media-id',
      title: 'Título nuevo',
      description: 'Descripción original.',
      altText: 'Texto alternativo original.',
      objectKey: 'gallery/montaje.jpg',
      format: 'JPG',
      isVideo: false,
      colSpan: 1,
      rowSpan: 1,
      capturedAt,
      uploaderName: 'LASCE',
    })

    await expect(updateGalleryMedia('media-id', { title: 'Título nuevo' })).resolves.toEqual({
      ok: true,
      media: {
        id: 'media-id',
        title: 'Título nuevo',
        description: 'Descripción original.',
        alt: 'Texto alternativo original.',
        objectKey: 'gallery/montaje.jpg',
        format: 'JPG',
        isVideo: false,
        colSpan: 1,
        rowSpan: 1,
        date: '2026-02-16',
        uploader: 'LASCE',
      },
    })
    expect(mocks.galleryMediaUpdate).toHaveBeenCalledWith({
      where: { id: 'media-id' },
      data: { title: 'Título nuevo' },
    })
  })

  test('converts date updates and maps not-found and conflict errors', async () => {
    mocks.galleryMediaUpdate.mockResolvedValue({
      id: 'media-id',
      title: 'Montaje',
      description: 'Descripción.',
      altText: 'Texto alternativo.',
      objectKey: 'gallery/montaje.jpg',
      format: 'JPG',
      isVideo: false,
      colSpan: 1,
      rowSpan: 1,
      capturedAt: new Date('2026-03-01T00:00:00.000Z'),
      uploaderName: 'LASCE',
    })

    await updateGalleryMedia('media-id', { date: '2026-03-01' })
    expect(mocks.galleryMediaUpdate).toHaveBeenCalledWith({
      where: { id: 'media-id' },
      data: { capturedAt: new Date('2026-03-01T00:00:00.000Z') },
    })

    mocks.galleryMediaUpdate.mockRejectedValueOnce({ code: 'P2025' })
    await expect(updateGalleryMedia('missing-id', { title: 'Título' })).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    })

    mocks.galleryMediaUpdate.mockRejectedValueOnce({ code: 'P2002' })
    await expect(
      updateGalleryMedia('media-id', { objectKey: 'already-used.jpg' }),
    ).resolves.toEqual({ ok: false, reason: 'conflict' })
  })
})
