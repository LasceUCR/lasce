import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type * as Crypto from 'node:crypto'

import type { GalleryAlbum, GalleryMedia } from './gallery'

const mocks = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    readonly code: string
    readonly meta: unknown

    constructor(message: string, { code, meta }: { code: string; meta?: unknown }) {
      super(message)
      this.code = code
      this.meta = meta
    }
  }

  const tx = {
    galleryAlbum: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    galleryAlbumTranslation: { upsert: vi.fn() },
    galleryMediaTranslation: { upsert: vi.fn() },
    galleryMedia: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  }

  const prisma = {
    galleryAlbum: { findMany: vi.fn(), deleteMany: vi.fn() },
    galleryMedia: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  }

  return {
    tx,
    prisma,
    PrismaClientKnownRequestError,
    randomUUID: vi.fn(() => '9f3ce6d7-f3c9-4b43-8a93-40cd86b49798'),
  }
})

vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof Crypto>()),
  randomUUID: mocks.randomUUID,
}))

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const {
  albumCreateSchema,
  albumFileCount,
  albumMeta,
  albumPath,
  albumSlugs,
  albumUpdateSchema,
  createGalleryMedia,
  createGallerySubAlbum,
  createTopLevelGalleryAlbum,
  deleteGalleryAlbum,
  deleteGalleryMedia,
  findPendingReviews,
  findPendingMediaReviews,
  galleryAlbumList,
  galleryAlbums,
  galleryMediaInputSchema,
  galleryMediaUpdateSchema,
  getGalleryAlbums,
  getGalleryPaths,
  mediaPlaceholder,
  subAlbumCreateSchema,
  subAlbumPath,
  updateGalleryAlbum,
  updateGalleryMedia,
} = await import('./gallery')

const { prisma, tx } = mocks

const albumId = '39bf18d8-e9ab-44c9-9043-71121c3bc2d9'
const parentAlbumId = 'd373bcfb-dd4c-486d-a6f2-a5282d8bc65e'
const version = '2026-09-01T10:00:00.000Z'

const topLevelInput = {
  slug: 'rosac',
  yearsLabel: '2025–2026',
  coverObjectKey: '/images/galeria/rosac-cover.jpg',
  content: {
    es: {
      title: 'ROSAC',
      description: 'Construcción y desarrollo del observatorio.',
    },
    en: {
      title: 'ROSAC',
      description: 'Construction and development of the observatory.',
    },
  },
}

const subAlbumInput = {
  slug: 'cimentacion',
  coverObjectKey: '/images/galeria/cimentacion-cover.jpg',
  content: {
    es: {
      title: 'Cimentación',
      description: 'Construcción de la base.',
    },
    en: {
      title: 'Foundations',
      description: 'Construction of the foundation.',
    },
  },
}

const mediaInput = {
  content: {
    es: {
      title: 'Montaje',
      description: 'Montaje del reflector.',
      altText: 'Reflector durante el montaje.',
    },
    en: {
      title: 'Assembly',
      description: 'Assembly of the dish.',
      altText: 'Dish during assembly.',
    },
  },
  objectKey: 'gallery/montaje.jpg',
  format: 'JPG',
  isVideo: false,
  colSpan: 2 as const,
  rowSpan: 1 as const,
  date: '2026-02-16',
  uploader: 'LASCE',
}

// Vitest runs with apps/web as its working directory.
const publicDir = join(process.cwd(), 'public')

function uniqueViolation(meta: unknown) {
  return new mocks.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    meta,
  })
}

function albumRecord(
  overrides: Partial<Record<string, unknown>> = {},
  translation: { locale: string; title: string; description: string } | null = {
    locale: 'en',
    title: topLevelInput.content.en.title,
    description: topLevelInput.content.en.description,
  },
) {
  return {
    id: albumId,
    slug: topLevelInput.slug,
    title: topLevelInput.content.es.title,
    description: topLevelInput.content.es.description,
    yearsLabel: topLevelInput.yearsLabel,
    coverObjectKey: topLevelInput.coverObjectKey,
    updatedAt: new Date(version),
    media: [],
    translations: translation ? [translation] : [],
    ...overrides,
  }
}

function subAlbumRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'subalbum-id',
    slug: subAlbumInput.slug,
    title: subAlbumInput.content.es.title,
    description: subAlbumInput.content.es.description,
    yearsLabel: null,
    coverObjectKey: subAlbumInput.coverObjectKey,
    updatedAt: new Date(version),
    media: [],
    translations: [
      {
        locale: 'en',
        title: subAlbumInput.content.en.title,
        description: subAlbumInput.content.en.description,
      },
    ],
    ...overrides,
  }
}

function mediaRecord(
  overrides: Partial<Record<string, unknown>> = {},
  translation: { locale: string; title: string; description: string; altText: string } | null = {
    locale: 'en',
    title: mediaInput.content.en.title,
    description: mediaInput.content.en.description,
    altText: mediaInput.content.en.altText,
  },
) {
  return {
    id: 'media-id',
    title: mediaInput.content.es.title,
    description: mediaInput.content.es.description,
    altText: mediaInput.content.es.altText,
    objectKey: mediaInput.objectKey,
    format: mediaInput.format,
    isVideo: mediaInput.isVideo,
    colSpan: mediaInput.colSpan,
    rowSpan: mediaInput.rowSpan,
    capturedAt: new Date('2026-02-16T00:00:00.000Z'),
    uploaderName: mediaInput.uploader,
    updatedAt: new Date(version),
    translations: translation ? [translation] : [],
    ...overrides,
  }
}

function everyMedia(): GalleryMedia[] {
  return galleryAlbumList.flatMap((album) => [
    ...album.media,
    ...album.subAlbums.flatMap((subAlbum) => [...subAlbum.media]),
  ])
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('gallery', () => {
  test('builds a public path for an album and for a sub-album', () => {
    expect(albumPath('rosac')).toBe('/galeria/rosac')
    expect(subAlbumPath('rosac', 'fotogrametria')).toBe('/galeria/rosac/fotogrametria')
  })

  test('lists the pages of the albums and sub-albums stored in the database', async () => {
    prisma.galleryAlbum.findMany.mockResolvedValue([
      { slug: 'rosac', subAlbums: [{ slug: 'fotogrametria' }, { slug: 'antena' }] },
      { slug: 'taller', subAlbums: [] },
    ])

    await expect(getGalleryPaths()).resolves.toEqual([
      '/galeria/rosac',
      '/galeria/rosac/fotogrametria',
      '/galeria/rosac/antena',
      '/galeria/taller',
    ])
    expect(prisma.galleryAlbum.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentAlbumId: null } }),
    )
  })

  test('counts an album own files plus everything in its sub-albums', () => {
    const rosac = galleryAlbums.rosac
    const inSubAlbums = rosac.subAlbums.reduce((total, sub) => total + sub.media.length, 0)

    expect(albumFileCount(rosac)).toBe(rosac.media.length + inSubAlbums)
  })

  test('builds the summary line from the files actually present', () => {
    expect(
      albumMeta(
        galleryAlbums.rosac,
        (count) => `${count} archivos`,
        (count) => `${count} subálbumes`,
      ),
    ).toBe(`5 subálbumes · ${albumFileCount(galleryAlbums.rosac)} archivos · 2019–2023`)
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

    expect(
      albumMeta(
        standalone,
        (count) => `${count} archivos`,
        (count) => `${count} subálbumes`,
      ),
    ).toBe(`${galleryAlbums.rosac.media.length} archivos · 2024`)
    expect(
      albumMeta(
        standalone,
        (count) => `${count} archivos`,
        (count) => `${count} subálbumes`,
      ),
    ).not.toContain('subálbumes')
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

describe('gallery management schemas', () => {
  test('accepts bilingual top-level and sub-album inputs', () => {
    expect(albumCreateSchema.safeParse(topLevelInput).success).toBe(true)
    expect(subAlbumCreateSchema.safeParse(subAlbumInput).success).toBe(true)
  })

  test('rejects the removed flat album shape and requires both locales', () => {
    expect(
      albumCreateSchema.safeParse({
        slug: 'rosac',
        title: 'ROSAC',
        description: 'Construcción y desarrollo del observatorio.',
      }).success,
    ).toBe(false)

    expect(
      albumCreateSchema.safeParse({
        ...topLevelInput,
        content: { es: topLevelInput.content.es },
      }).success,
    ).toBe(false)
  })

  test('requires versioned album updates and leaves omitted nullable fields untouched', () => {
    expect(
      albumUpdateSchema.parse({
        version,
        slug: ' rosac-2026 ',
        yearsLabel: null,
        coverObjectKey: null,
      }),
    ).toEqual({
      version,
      slug: 'rosac-2026',
      yearsLabel: null,
      coverObjectKey: null,
    })

    expect(albumUpdateSchema.safeParse({ version }).success).toBe(false)
    expect(albumUpdateSchema.parse({ version, slug: 'rosac' })).toEqual({ version, slug: 'rosac' })
    expect(albumUpdateSchema.safeParse({ slug: 'rosac' }).success).toBe(false)
    expect(
      albumUpdateSchema.safeParse({
        version,
        confirmedUnchanged: [{ locale: 'en', field: 'title' }],
      }).success,
    ).toBe(false)
  })

  test('tracks one-language content changes that need review', () => {
    const current = {
      es: topLevelInput.content.es,
      en: topLevelInput.content.en,
    }

    expect(
      findPendingReviews(
        current,
        {
          es: { ...topLevelInput.content.es, title: 'ROSAC actualizado' },
          en: topLevelInput.content.en,
        },
        [],
      ),
    ).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('tracks one-language media content changes that need review', () => {
    const current = {
      es: mediaInput.content.es,
      en: mediaInput.content.en,
    }

    expect(
      findPendingMediaReviews(
        current,
        {
          es: { ...mediaInput.content.es, title: 'Montaje actualizado' },
          en: mediaInput.content.en,
        },
        [],
      ),
    ).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('validates media metadata and applies defaults', () => {
    expect(
      galleryMediaInputSchema.parse({
        content: {
          es: {
            title: ' Foto ',
            description: ' Descripción ',
            altText: ' Texto alternativo ',
          },
          en: {
            title: ' Photo ',
            description: ' Description ',
            altText: ' Alt text ',
          },
        },
        objectKey: ' assets/foto.jpg ',
        format: ' JPG ',
        date: '2026-02-16',
        uploader: ' LASCE ',
      }),
    ).toEqual({
      content: {
        es: {
          title: 'Foto',
          description: 'Descripción',
          altText: 'Texto alternativo',
        },
        en: {
          title: 'Photo',
          description: 'Description',
          altText: 'Alt text',
        },
      },
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
        ...mediaInput,
        date: '2026-02-30',
      }).success,
    ).toBe(false)
  })

  test('accepts partial media updates but rejects empty or invalid ones', () => {
    expect(galleryMediaUpdateSchema.parse({ version, colSpan: 2 })).toEqual({
      version,
      colSpan: 2,
    })
    expect(galleryMediaUpdateSchema.safeParse({ version }).success).toBe(false)
    expect(galleryMediaUpdateSchema.safeParse({ rowSpan: 5 }).success).toBe(false)
    expect(
      galleryMediaUpdateSchema.safeParse({
        version,
        confirmedUnchanged: [{ locale: 'en', field: 'title' }],
      }).success,
    ).toBe(false)
  })
})

describe('getGalleryAlbums', () => {
  test('maps translated albums, editing data, and nested media for the requested locale', async () => {
    prisma.galleryAlbum.findMany.mockResolvedValue([
      {
        ...albumRecord({
          media: [
            mediaRecord({
              objectKey: '/images/galeria/montaje.jpg',
            }),
          ],
          subAlbums: [
            subAlbumRecord({
              media: [],
            }),
          ],
        }),
      },
    ])

    await expect(getGalleryAlbums('en', { includeEditingData: true })).resolves.toEqual([
      {
        id: albumId,
        slug: 'rosac',
        title: 'ROSAC',
        description: 'Construction and development of the observatory.',
        years: '2025–2026',
        yearsLabel: '2025–2026',
        coverObjectKey: '/images/galeria/rosac-cover.jpg',
        src: '/images/galeria/rosac-cover.jpg',
        contentLocale: 'en',
        editing: {
          content: {
            es: topLevelInput.content.es,
            en: topLevelInput.content.en,
          },
          isLegacy: false,
          version,
        },
        media: [
          {
            id: 'media-id',
            title: 'Assembly',
            description: 'Assembly of the dish.',
            alt: 'Dish during assembly.',
            objectKey: '/images/galeria/montaje.jpg',
            src: '/images/galeria/montaje.jpg',
            format: 'JPG',
            isVideo: false,
            colSpan: 2,
            rowSpan: 1,
            contentLocale: 'en',
            date: '2026-02-16',
            uploader: 'LASCE',
            editing: {
              content: {
                es: mediaInput.content.es,
                en: mediaInput.content.en,
              },
              isLegacy: false,
              version,
            },
          },
        ],
        subAlbums: [
          {
            id: 'subalbum-id',
            slug: 'cimentacion',
            title: 'Foundations',
            description: 'Construction of the foundation.',
            coverObjectKey: '/images/galeria/cimentacion-cover.jpg',
            src: '/images/galeria/cimentacion-cover.jpg',
            contentLocale: 'en',
            editing: {
              content: {
                es: subAlbumInput.content.es,
                en: subAlbumInput.content.en,
              },
              isLegacy: false,
              version,
            },
            media: [],
          },
        ],
      },
    ])

    expect(prisma.galleryAlbum.findMany).toHaveBeenCalledWith({
      where: { parentAlbumId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          orderBy: { position: 'asc' },
          include: {
            translations: {
              where: { locale: { in: ['en'] } },
              select: { locale: true, title: true, description: true, altText: true },
            },
          },
        },
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, description: true },
        },
        subAlbums: {
          orderBy: { createdAt: 'desc' },
          include: {
            media: {
              orderBy: { position: 'asc' },
              include: {
                translations: {
                  where: { locale: { in: ['en'] } },
                  select: { locale: true, title: true, description: true, altText: true },
                },
              },
            },
            translations: {
              where: { locale: { in: ['en'] } },
              select: { locale: true, title: true, description: true },
            },
          },
        },
      },
    })
  })

  test('shows the month names of the period in the visitor language', async () => {
    prisma.galleryAlbum.findMany.mockResolvedValue([
      albumRecord({
        yearsLabel: 'febrero 2026',
        media: [],
        subAlbums: [subAlbumRecord({ yearsLabel: 'marzo 2024–junio 2025', media: [] })],
      }),
    ])

    await expect(getGalleryAlbums('en')).resolves.toEqual([
      expect.objectContaining({
        years: 'February 2026',
        yearsLabel: 'February 2026',
        subAlbums: [expect.objectContaining({ yearsLabel: 'March 2024–June 2025' })],
      }),
    ])
    await expect(getGalleryAlbums('es')).resolves.toEqual([
      expect.objectContaining({ years: 'febrero 2026' }),
    ])
  })

  test('falls back to base content for a legacy record and marks its language as unknown', async () => {
    prisma.galleryAlbum.findMany.mockResolvedValue([
      {
        ...albumRecord(
          {
            coverObjectKey: null,
            media: [mediaRecord({ objectKey: 'gallery/montaje.jpg' }, null)],
            subAlbums: [],
          },
          null,
        ),
      },
    ])

    await expect(getGalleryAlbums('en')).resolves.toEqual([
      expect.objectContaining({
        title: 'ROSAC',
        description: 'Construcción y desarrollo del observatorio.',
        contentLocale: null,
        media: [
          expect.objectContaining({
            title: 'Montaje',
            description: 'Montaje del reflector.',
            alt: 'Reflector durante el montaje.',
            contentLocale: null,
          }),
        ],
      }),
    ])
  })

  test('rejects stored media tile spans that cannot be rendered', async () => {
    prisma.galleryAlbum.findMany.mockResolvedValue([
      {
        ...albumRecord({ coverObjectKey: null, subAlbums: [] }, null),
        media: [mediaRecord({ colSpan: 0 }, null)],
      },
    ])

    await expect(getGalleryAlbums()).rejects.toThrow(
      'Gallery media media-id has invalid colSpan: 0',
    )
  })
})

describe('createTopLevelGalleryAlbum', () => {
  test('stores Spanish on the base row and English as a translation', async () => {
    tx.galleryAlbum.create.mockResolvedValue(albumRecord({ subAlbums: [] }))

    const result = await createTopLevelGalleryAlbum(albumCreateSchema.parse(topLevelInput))

    expect(result).toEqual({
      ok: true,
      album: {
        id: albumId,
        slug: 'rosac',
        title: 'ROSAC',
        description: 'Construcción y desarrollo del observatorio.',
        yearsLabel: '2025–2026',
        coverObjectKey: '/images/galeria/rosac-cover.jpg',
        src: '/images/galeria/rosac-cover.jpg',
        contentLocale: 'es',
        editing: {
          content: {
            es: topLevelInput.content.es,
            en: topLevelInput.content.en,
          },
          isLegacy: false,
          version,
        },
        media: [],
      },
    })

    expect(tx.galleryAlbum.create).toHaveBeenCalledWith({
      data: {
        title: topLevelInput.content.es.title,
        description: topLevelInput.content.es.description,
        slug: 'rosac',
        yearsLabel: '2025–2026',
        coverObjectKey: '/images/galeria/rosac-cover.jpg',
        parentAlbumId: null,
        translations: {
          create: [
            {
              locale: 'en',
              title: topLevelInput.content.en.title,
              description: topLevelInput.content.en.description,
            },
          ],
        },
      },
      include: {
        media: {
          orderBy: { position: 'asc' },
          include: {
            translations: {
              where: { locale: { in: ['en'] } },
              select: { locale: true, title: true, description: true, altText: true },
            },
          },
        },
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, description: true },
        },
      },
    })
  })

  test('retries a duplicate slug once with a UUID suffix', async () => {
    tx.galleryAlbum.create
      .mockRejectedValueOnce(uniqueViolation({ target: ['slug'] }))
      .mockResolvedValueOnce(albumRecord({ slug: 'rosac-9f3ce6d7-f3c9-4b43-8a93-40cd86b49798' }))

    const result = await createTopLevelGalleryAlbum(albumCreateSchema.parse(topLevelInput))

    expect(result.ok).toBe(true)
    expect(tx.galleryAlbum.create).toHaveBeenCalledTimes(2)
    expect(tx.galleryAlbum.create.mock.calls[1]?.[0]).toMatchObject({
      data: expect.objectContaining({
        slug: expect.stringMatching(
          /^rosac-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
        parentAlbumId: null,
      }),
    })
  })

  test('reports duplicate-slug when the retry also collides', async () => {
    tx.galleryAlbum.create
      .mockRejectedValueOnce(uniqueViolation({ target: ['slug'] }))
      .mockRejectedValueOnce(uniqueViolation({ target: ['slug'] }))

    await expect(
      createTopLevelGalleryAlbum(albumCreateSchema.parse(topLevelInput)),
    ).resolves.toEqual({
      ok: false,
      reason: 'duplicate-slug',
    })
  })
})

describe('updateGalleryAlbum', () => {
  test('updates shared fields only, conditioned on the loaded version', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValue({
      title: topLevelInput.content.es.title,
      description: topLevelInput.content.es.description,
      updatedAt: new Date(version),
      translations: [
        {
          locale: 'en',
          title: topLevelInput.content.en.title,
          description: topLevelInput.content.en.description,
        },
      ],
    })
    tx.galleryAlbum.updateMany.mockResolvedValue({ count: 1 })
    tx.galleryAlbum.findUniqueOrThrow.mockResolvedValue(
      albumRecord({ slug: 'rosac-2026', yearsLabel: null, coverObjectKey: null, subAlbums: [] }),
    )

    const result = await updateGalleryAlbum(
      albumId,
      albumUpdateSchema.parse({
        version,
        slug: 'rosac-2026',
        yearsLabel: null,
        coverObjectKey: null,
      }),
    )

    expect(result.ok).toBe(true)
    expect(tx.galleryAlbum.updateMany).toHaveBeenCalledWith({
      where: { id: albumId, updatedAt: new Date(version) },
      data: {
        slug: 'rosac-2026',
        yearsLabel: null,
        coverObjectKey: null,
        updatedAt: expect.any(Date),
      },
    })
    expect(tx.galleryAlbumTranslation.upsert).not.toHaveBeenCalled()
  })

  test('upserts translations during a bilingual content update', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValue({
      title: topLevelInput.content.es.title,
      description: topLevelInput.content.es.description,
      updatedAt: new Date(version),
      translations: [
        {
          locale: 'en',
          title: topLevelInput.content.en.title,
          description: topLevelInput.content.en.description,
        },
      ],
    })
    tx.galleryAlbum.updateMany.mockResolvedValue({ count: 1 })
    tx.galleryAlbum.findUniqueOrThrow.mockResolvedValue(
      albumRecord({
        title: 'ROSAC actualizado',
        description: 'Construcción y desarrollo del observatorio.',
        subAlbums: [],
        translations: [
          {
            locale: 'en',
            title: 'ROSAC updated',
            description: 'Construction and development of the observatory.',
          },
        ],
      }),
    )

    const input = albumUpdateSchema.parse({
      version,
      content: {
        es: {
          title: 'ROSAC actualizado',
          description: 'Construcción y desarrollo del observatorio.',
        },
        en: {
          title: 'ROSAC updated',
          description: 'Construction and development of the observatory.',
        },
      },
    })

    const result = await updateGalleryAlbum(albumId, input)

    expect(result.ok).toBe(true)
    expect(tx.galleryAlbum.updateMany).toHaveBeenCalledWith({
      where: { id: albumId, updatedAt: new Date(version) },
      data: {
        title: 'ROSAC actualizado',
        description: 'Construcción y desarrollo del observatorio.',
        updatedAt: expect.any(Date),
      },
    })
    expect(tx.galleryAlbumTranslation.upsert).toHaveBeenCalledWith({
      where: { albumId_locale: { albumId, locale: 'en' } },
      create: {
        albumId,
        locale: 'en',
        title: 'ROSAC updated',
        description: 'Construction and development of the observatory.',
      },
      update: {
        title: 'ROSAC updated',
        description: 'Construction and development of the observatory.',
      },
    })
  })

  test('returns conflict when the stored version no longer matches', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValue({
      title: topLevelInput.content.es.title,
      description: topLevelInput.content.es.description,
      updatedAt: new Date('2026-09-02T10:00:00.000Z'),
      translations: [
        {
          locale: 'en',
          title: topLevelInput.content.en.title,
          description: topLevelInput.content.en.description,
        },
      ],
    })

    await expect(
      updateGalleryAlbum(albumId, albumUpdateSchema.parse({ version, slug: 'rosac-2026' })),
    ).resolves.toEqual({ ok: false, reason: 'conflict' })

    expect(tx.galleryAlbum.updateMany).not.toHaveBeenCalled()
  })

  test('returns review-required when one language changes alone', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValue({
      title: topLevelInput.content.es.title,
      description: topLevelInput.content.es.description,
      updatedAt: new Date(version),
      translations: [
        {
          locale: 'en',
          title: topLevelInput.content.en.title,
          description: topLevelInput.content.en.description,
        },
      ],
    })

    await expect(
      updateGalleryAlbum(
        albumId,
        albumUpdateSchema.parse({
          version,
          content: {
            es: {
              title: 'ROSAC actualizado',
              description: topLevelInput.content.es.description,
            },
            en: topLevelInput.content.en,
          },
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    expect(tx.galleryAlbum.updateMany).not.toHaveBeenCalled()
  })
})

describe('deleteGalleryAlbum', () => {
  test('deletes the album database record and returns true', async () => {
    prisma.galleryAlbum.deleteMany.mockResolvedValue({ count: 1 })

    await expect(deleteGalleryAlbum(albumId)).resolves.toBe(true)
    expect(prisma.galleryAlbum.deleteMany).toHaveBeenCalledWith({ where: { id: albumId } })
  })

  test('returns false when the album does not exist', async () => {
    prisma.galleryAlbum.deleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteGalleryAlbum('missing-id')).resolves.toBe(false)
  })
})

describe('createGallerySubAlbum', () => {
  test('creates a sub-album linked to its top-level parent', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValue({ id: parentAlbumId, parentAlbumId: null })
    tx.galleryAlbum.create.mockResolvedValue(subAlbumRecord())

    const result = await createGallerySubAlbum(
      parentAlbumId,
      subAlbumCreateSchema.parse(subAlbumInput),
    )

    expect(result).toEqual({
      ok: true,
      album: {
        id: 'subalbum-id',
        slug: 'cimentacion',
        title: 'Cimentación',
        description: 'Construcción de la base.',
        coverObjectKey: '/images/galeria/cimentacion-cover.jpg',
        src: '/images/galeria/cimentacion-cover.jpg',
        contentLocale: 'es',
        editing: {
          content: {
            es: subAlbumInput.content.es,
            en: subAlbumInput.content.en,
          },
          isLegacy: false,
          version,
        },
        media: [],
      },
    })
    expect(tx.galleryAlbum.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentAlbumId,
          slug: 'cimentacion',
          title: 'Cimentación',
          description: 'Construcción de la base.',
          translations: {
            create: [
              {
                locale: 'en',
                title: 'Foundations',
                description: 'Construction of the foundation.',
              },
            ],
          },
        }),
      }),
    )
  })

  test('rejects a missing or nested parent without creating an album', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValueOnce(null)

    await expect(
      createGallerySubAlbum(parentAlbumId, subAlbumCreateSchema.parse(subAlbumInput)),
    ).resolves.toEqual({
      ok: false,
      reason: 'parent-not-found',
    })

    tx.galleryAlbum.findUnique.mockResolvedValueOnce({
      id: parentAlbumId,
      parentAlbumId: 'another-parent',
    })

    await expect(
      createGallerySubAlbum(parentAlbumId, subAlbumCreateSchema.parse(subAlbumInput)),
    ).resolves.toEqual({
      ok: false,
      reason: 'parent-not-top-level',
    })

    expect(tx.galleryAlbum.create).not.toHaveBeenCalled()
  })
})

describe('createGalleryMedia', () => {
  test('creates media at the front of the album and maps it to gallery fields', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValue({ id: albumId })
    tx.galleryMedia.findFirst.mockResolvedValue({ position: 3 })
    tx.galleryMedia.create.mockResolvedValue(mediaRecord())

    await expect(createGalleryMedia(albumId, mediaInput)).resolves.toEqual({
      ok: true,
      media: {
        id: 'media-id',
        title: mediaInput.content.es.title,
        description: mediaInput.content.es.description,
        alt: mediaInput.content.es.altText,
        objectKey: mediaInput.objectKey,
        format: mediaInput.format,
        isVideo: false,
        colSpan: 2,
        rowSpan: 1,
        contentLocale: 'es',
        date: '2026-02-16',
        uploader: mediaInput.uploader,
        editing: {
          content: {
            es: mediaInput.content.es,
            en: mediaInput.content.en,
          },
          isLegacy: false,
          version,
        },
      },
    })
    expect(tx.galleryMedia.create).toHaveBeenCalledWith({
      data: {
        albumId,
        title: mediaInput.content.es.title,
        description: mediaInput.content.es.description,
        altText: mediaInput.content.es.altText,
        objectKey: mediaInput.objectKey,
        format: mediaInput.format,
        isVideo: mediaInput.isVideo,
        colSpan: mediaInput.colSpan,
        rowSpan: mediaInput.rowSpan,
        capturedAt: new Date('2026-02-16T00:00:00.000Z'),
        uploaderName: mediaInput.uploader,
        position: 2,
        translations: {
          create: [
            {
              locale: 'en',
              title: mediaInput.content.en.title,
              description: mediaInput.content.en.description,
              altText: mediaInput.content.en.altText,
            },
          ],
        },
      },
      include: {
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, description: true, altText: true },
        },
      },
    })
  })

  test('reports a missing album and a unique-key conflict', async () => {
    tx.galleryAlbum.findUnique.mockResolvedValueOnce(null)

    await expect(createGalleryMedia(albumId, mediaInput)).resolves.toEqual({
      ok: false,
      reason: 'album-not-found',
    })

    tx.galleryAlbum.findUnique.mockResolvedValueOnce({ id: albumId })
    tx.galleryMedia.findFirst.mockResolvedValueOnce(null)
    tx.galleryMedia.create.mockRejectedValueOnce(uniqueViolation({ target: ['object_key'] }))

    await expect(createGalleryMedia(albumId, mediaInput)).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    })
  })
})

describe('updateGalleryMedia', () => {
  test('updates translated media, upserts translations, and returns editing data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T10:00:00.500Z'))
    tx.galleryMedia.findUnique.mockResolvedValue(mediaRecord())
    tx.galleryMedia.updateMany.mockResolvedValue({ count: 1 })
    tx.galleryMedia.findUniqueOrThrow.mockResolvedValue(
      mediaRecord({
        title: 'Montaje actualizado',
        description: 'Montaje del reflector actualizado.',
        altText: 'Reflector actualizado durante el montaje.',
        rowSpan: 3,
        updatedAt: new Date('2026-09-01T10:00:00.500Z'),
        translations: [
          {
            locale: 'en',
            title: 'Updated assembly',
            description: 'Updated assembly of the dish.',
            altText: 'Updated dish during assembly.',
          },
        ],
      }),
    )

    await expect(
      updateGalleryMedia('media-id', {
        version,
        rowSpan: 3,
        content: {
          es: {
            title: 'Montaje actualizado',
            description: 'Montaje del reflector actualizado.',
            altText: 'Reflector actualizado durante el montaje.',
          },
          en: {
            title: 'Updated assembly',
            description: 'Updated assembly of the dish.',
            altText: 'Updated dish during assembly.',
          },
        },
      }),
    ).resolves.toEqual({
      ok: true,
      media: {
        id: 'media-id',
        title: 'Montaje actualizado',
        description: 'Montaje del reflector actualizado.',
        alt: 'Reflector actualizado durante el montaje.',
        objectKey: 'gallery/montaje.jpg',
        format: 'JPG',
        isVideo: false,
        colSpan: 2,
        rowSpan: 3,
        contentLocale: 'es',
        date: '2026-02-16',
        uploader: 'LASCE',
        editing: {
          content: {
            es: {
              title: 'Montaje actualizado',
              description: 'Montaje del reflector actualizado.',
              altText: 'Reflector actualizado durante el montaje.',
            },
            en: {
              title: 'Updated assembly',
              description: 'Updated assembly of the dish.',
              altText: 'Updated dish during assembly.',
            },
          },
          isLegacy: false,
          version: '2026-09-01T10:00:00.500Z',
        },
      },
    })
    expect(tx.galleryMedia.updateMany).toHaveBeenCalledWith({
      where: { id: 'media-id', updatedAt: new Date(version) },
      data: {
        title: 'Montaje actualizado',
        description: 'Montaje del reflector actualizado.',
        altText: 'Reflector actualizado durante el montaje.',
        rowSpan: 3,
        updatedAt: new Date('2026-09-01T10:00:00.500Z'),
      },
    })
    expect(tx.galleryMediaTranslation.upsert).toHaveBeenCalledWith({
      where: { galleryMediaId_locale: { galleryMediaId: 'media-id', locale: 'en' } },
      create: {
        galleryMediaId: 'media-id',
        locale: 'en',
        title: 'Updated assembly',
        description: 'Updated assembly of the dish.',
        altText: 'Updated dish during assembly.',
      },
      update: {
        title: 'Updated assembly',
        description: 'Updated assembly of the dish.',
        altText: 'Updated dish during assembly.',
      },
    })
    expect(tx.galleryMedia.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'media-id' },
      include: {
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, description: true, altText: true },
        },
      },
    })
    vi.useRealTimers()
  })

  test('reports a version conflict before writing', async () => {
    tx.galleryMedia.findUnique.mockResolvedValueOnce(
      mediaRecord({ updatedAt: new Date('2026-09-01T10:00:01.000Z') }),
    )

    await expect(
      updateGalleryMedia('media-id', {
        version,
        rowSpan: 4,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    })

    expect(tx.galleryMedia.updateMany).not.toHaveBeenCalled()
  })

  test('returns review-required when one language changes alone', async () => {
    tx.galleryMedia.findUnique.mockResolvedValueOnce(mediaRecord())

    await expect(
      updateGalleryMedia('media-id', {
        version,
        content: {
          es: { ...mediaInput.content.es, title: 'Montaje actualizado' },
          en: mediaInput.content.en,
        },
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    expect(tx.galleryMedia.updateMany).not.toHaveBeenCalled()
  })

  test('converts date updates and reports not-found or unique conflicts', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T10:00:00.500Z'))
    tx.galleryMedia.findUnique.mockResolvedValueOnce(mediaRecord())
    tx.galleryMedia.updateMany.mockResolvedValueOnce({ count: 1 })
    tx.galleryMedia.findUniqueOrThrow.mockResolvedValueOnce(
      mediaRecord({
        capturedAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-09-01T10:00:00.500Z'),
      }),
    )

    await updateGalleryMedia('media-id', { version, date: '2026-03-01' })
    expect(tx.galleryMedia.updateMany).toHaveBeenCalledWith({
      where: { id: 'media-id', updatedAt: new Date(version) },
      data: {
        capturedAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-09-01T10:00:00.500Z'),
      },
    })

    tx.galleryMedia.findUnique.mockResolvedValueOnce(null)
    await expect(updateGalleryMedia('missing-id', { version, rowSpan: 2 })).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    })

    tx.galleryMedia.findUnique.mockResolvedValueOnce(mediaRecord())
    tx.galleryMedia.updateMany.mockRejectedValueOnce(uniqueViolation({ target: ['object_key'] }))
    await expect(
      updateGalleryMedia('media-id', { version, objectKey: 'already-used.jpg' }),
    ).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    })
    vi.useRealTimers()
  })
})

describe('deleteGalleryMedia', () => {
  test('deletes only the matching database record', async () => {
    prisma.galleryMedia.deleteMany.mockResolvedValue({ count: 1 })

    await expect(deleteGalleryMedia('media-id')).resolves.toBe(true)
    expect(prisma.galleryMedia.deleteMany).toHaveBeenCalledWith({ where: { id: 'media-id' } })
  })

  test('returns false when no matching record exists', async () => {
    prisma.galleryMedia.deleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteGalleryMedia('missing-id')).resolves.toBe(false)
  })
})
