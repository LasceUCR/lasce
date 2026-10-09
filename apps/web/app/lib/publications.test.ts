import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  /** Stands in for Prisma's error class, which the module checks with `instanceof`. */
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
    publisher: { upsert: vi.fn() },
    research: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    researchTranslation: { upsert: vi.fn() },
    researchAuthor: { upsert: vi.fn() },
    researchCrossAuthor: { deleteMany: vi.fn(), create: vi.fn() },
  }

  const prisma = {
    research: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  }

  return { tx, prisma, PrismaClientKnownRequestError }
})

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const {
  createPublication,
  deletePublication,
  findPendingReviews,
  getPublications,
  publicationCreateSchema,
  publicationUpdateSchema,
  updatePublication,
} = await import('./publications')

const { tx, prisma } = mocks

const VERSION = '2026-09-01T10:00:00.000Z'

function researchRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'research-1',
    title: 'A geometrical description for interplanetary propagation of Earth-directed CMEs',
    publicationDate: new Date('2021-06-15T00:00:00.000Z'),
    researchGroup: 'LASCE',
    abstract: 'We present a 3D geometrical model...',
    externalUrl: 'https://doi.org/10.1093/mnras/stab1232',
    DOI: '10.1234/example',
    updatedAt: new Date(VERSION),
    publisher: { name: 'Monthly Notices of the Royal Astronomical Society' },
    authors: [
      { researchAuthor: { name: 'C. Salas-Matamoros' } },
      { researchAuthor: { name: 'J. Sánchez-Guevara' } },
    ],
    translations: [],
    ...overrides,
  }
}

const bilingualRow = researchRow({
  title: 'Descripción geométrica',
  abstract: 'Presentamos un modelo',
  translations: [
    { locale: 'en', title: 'Geometrical description', abstract: 'We present a model' },
  ],
})

const createBody = {
  content: {
    es: { title: 'Título', abstract: 'Resumen' },
    en: { title: 'Title', abstract: 'Abstract' },
  },
  authors: ['Juan Pérez', 'María Rodríguez'],
  href: 'https://example.com/publication',
  DOI: '10.1234/example',
  researchGroup: 'LASCE',
  venue: 'Solar Physics',
  date: '2026-01-01',
}

const updateBody = { ...createBody, version: VERSION }

function uniqueViolation(meta: unknown) {
  return new mocks.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    meta,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
  tx.publisher.upsert.mockResolvedValue({ id: 'publisher-1' })
  tx.research.create.mockResolvedValue({ id: 'research-1' })
  tx.research.findUnique.mockResolvedValue({
    title: 'Título',
    abstract: 'Resumen',
    updatedAt: new Date(VERSION),
    translations: [{ locale: 'en', title: 'Title', abstract: 'Abstract' }],
  })
  tx.research.updateMany.mockResolvedValue({ count: 1 })
  tx.research.findUniqueOrThrow.mockResolvedValue(bilingualRow)
  tx.researchAuthor.upsert.mockImplementation(({ create }: { create: { name: string } }) =>
    Promise.resolve({ id: `author-${create.name}` }),
  )
})

describe('getPublications', () => {
  test('maps a legacy record to the Publication shape, preserving author order', async () => {
    prisma.research.findMany.mockResolvedValue([researchRow()])

    const publications = await getPublications()

    expect(publications).toEqual([
      {
        slug: 'research-1',
        title: 'A geometrical description for interplanetary propagation of Earth-directed CMEs',
        authors: ['C. Salas-Matamoros', 'J. Sánchez-Guevara'],
        venue: 'Monthly Notices of the Royal Astronomical Society',
        year: '2021',
        date: new Date('2021-06-15'),
        abstract: 'We present a 3D geometrical model...',
        href: 'https://doi.org/10.1093/mnras/stab1232',
        DOI: '',
        researchGroup: 'LASCE',
        contentLocale: null,
      },
    ])
  })

  test('orders newest first, authors by citation position, and loads the stored translations', async () => {
    prisma.research.findMany.mockResolvedValue([])

    await getPublications()

    expect(prisma.research.findMany).toHaveBeenCalledWith({
      orderBy: { publicationDate: 'desc' },
      include: {
        publisher: true,
        authors: { orderBy: { position: 'asc' }, include: { researchAuthor: true } },
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, abstract: true },
        },
      },
    })
  })

  test('returns an empty list when there are no research records', async () => {
    prisma.research.findMany.mockResolvedValue([])

    expect(await getPublications()).toEqual([])
  })

  test('returns a single author without adding extra authors', async () => {
    prisma.research.findMany.mockResolvedValue([
      researchRow({ id: 'research-2', authors: [{ researchAuthor: { name: 'LASCE' } }] }),
    ])

    const [publication] = await getPublications()

    expect(publication?.authors).toEqual(['LASCE'])
  })

  test('shows the English text of a translated record in English', async () => {
    prisma.research.findMany.mockResolvedValue([bilingualRow])

    const [publication] = await getPublications('en')

    expect(publication).toMatchObject({
      title: 'Geometrical description',
      abstract: 'We present a model',
      contentLocale: 'en',
    })
  })

  test('shows the Spanish text of a translated record in Spanish', async () => {
    prisma.research.findMany.mockResolvedValue([bilingualRow])

    const [publication] = await getPublications('es')

    expect(publication).toMatchObject({
      title: 'Descripción geométrica',
      abstract: 'Presentamos un modelo',
      contentLocale: 'es',
    })
  })

  test('falls back to the base text of a legacy record in English, without claiming a language', async () => {
    prisma.research.findMany.mockResolvedValue([researchRow()])

    const [publication] = await getPublications('en')

    expect(publication?.title).toBe(
      'A geometrical description for interplanetary propagation of Earth-directed CMEs',
    )
    expect(publication?.contentLocale).toBeNull()
  })

  test('leaves editing data out unless asked for it', async () => {
    prisma.research.findMany.mockResolvedValue([bilingualRow])

    const [publication] = await getPublications('en')

    expect(publication).not.toHaveProperty('editing')
  })

  test('includes every language and the version when asked for editing data', async () => {
    prisma.research.findMany.mockResolvedValue([bilingualRow, researchRow({ id: 'legacy' })])

    const [bilingual, legacy] = await getPublications('en', { includeEditingData: true })

    expect(bilingual?.editing).toEqual({
      content: {
        es: { title: 'Descripción geométrica', abstract: 'Presentamos un modelo' },
        en: { title: 'Geometrical description', abstract: 'We present a model' },
      },
      isLegacy: false,
      version: VERSION,
    })
    expect(legacy?.editing).toMatchObject({ content: { en: null }, isLegacy: true })
  })
})

describe('publicationCreateSchema', () => {
  test('accepts a publication with every language', () => {
    expect(publicationCreateSchema.safeParse(createBody).success).toBe(true)
  })

  test('rejects a publication missing the English text', () => {
    const result = publicationCreateSchema.safeParse({
      ...createBody,
      content: { es: createBody.content.es },
    })

    expect(result.success).toBe(false)
  })

  test('rejects an English title that is only whitespace', () => {
    const result = publicationCreateSchema.safeParse({
      ...createBody,
      content: { ...createBody.content, en: { title: '   ', abstract: 'Abstract' } },
    })

    expect(result.success).toBe(false)
  })

  test('rejects an unsupported language', () => {
    const result = publicationCreateSchema.safeParse({
      ...createBody,
      content: { ...createBody.content, fr: createBody.content.en },
    })

    expect(result.success).toBe(false)
  })

  test('rejects the previous single-language shape', () => {
    const { content: _content, ...shared } = createBody

    expect(
      publicationCreateSchema.safeParse({ ...shared, title: 'Título', abstract: 'Resumen' })
        .success,
    ).toBe(false)
  })
})

describe('publicationCreateSchema: optional DOI and external link', () => {
  test('stores a missing, null or blank DOI and link as null', () => {
    const { href: _href, DOI: _doi, ...withoutBoth } = createBody

    expect(publicationCreateSchema.parse(withoutBoth)).toMatchObject({ href: null, DOI: null })
    expect(publicationCreateSchema.parse({ ...createBody, href: null, DOI: ' ' })).toMatchObject({
      href: null,
      DOI: null,
    })
  })

  test('accepts DOIs with registrant subdivisions and suffixes with slashes', () => {
    for (const DOI of ['10.1051/0004-6361/202450456', '10.1000.10/123456']) {
      expect(publicationCreateSchema.safeParse({ ...createBody, DOI }).success).toBe(true)
    }
  })

  test('rejects a DOI written as a resolver link', () => {
    const result = publicationCreateSchema.safeParse({
      ...createBody,
      DOI: 'https://doi.org/10.1234/example',
    })

    expect(result.success).toBe(false)
  })

  test('rejects an external link that is not an absolute http or https URL', () => {
    for (const href of ['example.com', 'ftp://example.com/a', 'mailto:lasce@ucr.ac.cr']) {
      expect(publicationCreateSchema.safeParse({ ...createBody, href }).success).toBe(false)
    }
  })

  test('names the language in its messages', () => {
    const result = publicationCreateSchema.safeParse({
      ...createBody,
      content: { ...createBody.content, en: { title: 'Title', abstract: '\n\t ' } },
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['content', 'en', 'abstract'],
        message: 'El resumen en inglés es obligatorio.',
      }),
    ])
  })
})

describe('publication date', () => {
  test.each([null, '', ' ', 0, false])('never turns %j into 1970-01-01', (date) => {
    const result = publicationCreateSchema.safeParse({ ...createBody, date })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['date'])
  })

  test('cannot be cleared by an update', () => {
    expect(publicationUpdateSchema.safeParse({ version: VERSION, date: null }).success).toBe(false)
  })

  test('accepts a date-only string as that day in UTC', () => {
    expect(publicationCreateSchema.parse({ ...createBody, date: '2026-09-17' }).date).toEqual(
      new Date('2026-09-17T00:00:00.000Z'),
    )
  })
})

describe('identical text in both languages', () => {
  test('is a valid publication', () => {
    const same = { title: 'ROSAC', abstract: 'Radio Observatorio de Santa Cruz.' }

    expect(
      publicationCreateSchema.safeParse({ ...createBody, content: { es: same, en: same } }).success,
    ).toBe(true)
  })

  test('still asks to review the other language when only one side changes', () => {
    const same = { title: 'ROSAC', abstract: 'Radio Observatorio.' }

    expect(
      findPendingReviews(
        { es: same, en: same },
        { es: { ...same, title: 'ROSAC (Costa Rica)' }, en: same },
        [],
      ),
    ).toEqual([{ locale: 'en', field: 'title' }])
  })
})

describe('publicationUpdateSchema', () => {
  test('requires the version the editor loaded', () => {
    expect(publicationUpdateSchema.safeParse(createBody).success).toBe(false)
    expect(publicationUpdateSchema.safeParse({ ...createBody, version: 'yesterday' }).success).toBe(
      false,
    )
  })

  test('leaves confirmations out when none are sent', () => {
    const parsed = publicationUpdateSchema.parse(updateBody)

    expect(parsed.confirmedUnchanged).toBeUndefined()
  })

  test('accepts an update of shared fields only, keeping just the fields sent', () => {
    const parsed = publicationUpdateSchema.parse({ version: VERSION, venue: ' Solar Physics ' })

    expect(parsed).toEqual({ version: VERSION, venue: 'Solar Physics' })
  })

  test('tells a cleared optional field apart from one left out', () => {
    expect(publicationUpdateSchema.parse({ version: VERSION, DOI: '' })).toEqual({
      version: VERSION,
      DOI: null,
    })
    expect(publicationUpdateSchema.parse({ version: VERSION, DOI: null })).toEqual({
      version: VERSION,
      DOI: null,
    })
  })

  test('rejects an update with nothing to change', () => {
    expect(publicationUpdateSchema.safeParse({ version: VERSION }).success).toBe(false)
  })

  test('rejects confirmations outside a content update', () => {
    const result = publicationUpdateSchema.safeParse({
      version: VERSION,
      venue: 'Solar Physics',
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(result.success).toBe(false)
  })

  test('rejects a confirmation for a field that is not translatable', () => {
    const result = publicationUpdateSchema.safeParse({
      ...updateBody,
      confirmedUnchanged: [{ locale: 'en', field: 'venue' }],
    })

    expect(result.success).toBe(false)
  })
})

describe('findPendingReviews', () => {
  const current = {
    es: { title: 'Título', abstract: 'Resumen' },
    en: { title: 'Title', abstract: 'Abstract' },
  }

  test('requires nothing when no translatable text changed', () => {
    expect(findPendingReviews(current, current, [])).toEqual([])
  })

  test('requires nothing when a field changed in every language', () => {
    const next = {
      ...current,
      es: { ...current.es, title: 'Nuevo' },
      en: { ...current.en, title: 'New' },
    }

    expect(findPendingReviews(current, next, [])).toEqual([])
  })

  test('requires reviewing the other language when a field changed in one', () => {
    const next = { ...current, es: { ...current.es, title: 'Nuevo' } }

    expect(findPendingReviews(current, next, [])).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('accepts an explicit confirmation that the other language is still correct', () => {
    const next = { ...current, en: { ...current.en, abstract: 'Better abstract' } }

    expect(findPendingReviews(current, next, [{ locale: 'es', field: 'abstract' }])).toEqual([])
  })

  test('does not let a confirmation for one field cover another', () => {
    const next = { ...current, es: { ...current.es, title: 'Nuevo' } }

    expect(findPendingReviews(current, next, [{ locale: 'en', field: 'abstract' }])).toEqual([
      { locale: 'en', field: 'title' },
    ])
  })

  test('ignores whitespace around stored text', () => {
    const stored = { ...current, es: { title: ' Título ', abstract: 'Resumen\n' } }

    expect(findPendingReviews(stored, current, [])).toEqual([])
  })

  test('requires reviewing the base text when completing a legacy record', () => {
    const legacy = { es: current.es, en: null }

    expect(findPendingReviews(legacy, current, [])).toEqual([
      { locale: 'es', field: 'title' },
      { locale: 'es', field: 'abstract' },
    ])
  })
})

describe('createPublication', () => {
  test('stores the Spanish text on the record and the English text as its translation', async () => {
    const result = await createPublication(publicationCreateSchema.parse(createBody))

    expect(tx.research.create).toHaveBeenCalledWith({
      data: {
        title: 'Título',
        abstract: 'Resumen',
        publicationDate: new Date('2026-01-01'),
        publisherId: 'publisher-1',
        externalUrl: 'https://example.com/publication',
        doi: '10.1234/example',
        researchGroup: 'LASCE',
        translations: { create: [{ locale: 'en', title: 'Title', abstract: 'Abstract' }] },
      },
    })
    expect(result).toMatchObject({
      ok: true,
      publication: { slug: 'research-1', editing: { isLegacy: false, version: VERSION } },
    })
  })

  test('writes everything inside one transaction', async () => {
    await createPublication(publicationCreateSchema.parse(createBody))

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.researchCrossAuthor.create).toHaveBeenCalledTimes(2)
    expect(tx.researchCrossAuthor.create).toHaveBeenLastCalledWith({
      data: { researchId: 'research-1', researchAuthorId: 'author-María Rodríguez', position: 1 },
    })
  })

  test('stores an empty link and DOI as null', async () => {
    await createPublication(publicationCreateSchema.parse({ ...createBody, href: '', DOI: ' ' }))

    expect(tx.research.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ externalUrl: null, doi: null }),
    })
  })

  test('reports a duplicate DOI as reported by the PostgreSQL driver adapter', async () => {
    tx.research.create.mockRejectedValue(
      uniqueViolation({
        modelName: 'Research',
        driverAdapterError: { cause: { constraint: { fields: ['doi'] } } },
      }),
    )

    await expect(createPublication(publicationCreateSchema.parse(createBody))).resolves.toEqual({
      ok: false,
      reason: 'duplicate',
      field: 'doi',
    })
  })

  test('reports a duplicate external link separately from a duplicate DOI', async () => {
    tx.research.create.mockRejectedValue(uniqueViolation({ target: ['external_url'] }))

    await expect(createPublication(publicationCreateSchema.parse(createBody))).resolves.toEqual({
      ok: false,
      reason: 'duplicate',
      field: 'externalUrl',
    })
  })

  test('rethrows a unique violation it cannot explain', async () => {
    const error = uniqueViolation({ target: 'research_id' })
    tx.research.create.mockRejectedValue(error)

    await expect(createPublication(publicationCreateSchema.parse(createBody))).rejects.toBe(error)
  })

  test('rethrows any other database error', async () => {
    const error = new Error('connection lost')
    tx.research.create.mockRejectedValue(error)

    await expect(createPublication(publicationCreateSchema.parse(createBody))).rejects.toBe(error)
  })
})

describe('updatePublication', () => {
  test('saves both languages, conditioned on the version the editor loaded', async () => {
    const changed = {
      ...updateBody,
      content: {
        es: { title: 'Título nuevo', abstract: 'Resumen' },
        en: { title: 'New title', abstract: 'Abstract' },
      },
    }

    const result = await updatePublication('research-1', publicationUpdateSchema.parse(changed))

    expect(result.ok).toBe(true)
    expect(tx.research.updateMany).toHaveBeenCalledWith({
      where: { id: 'research-1', updatedAt: new Date(VERSION) },
      data: expect.objectContaining({ title: 'Título nuevo', abstract: 'Resumen' }),
    })
    expect(tx.researchTranslation.upsert).toHaveBeenCalledWith({
      where: { researchId_locale: { researchId: 'research-1', locale: 'en' } },
      create: { researchId: 'research-1', locale: 'en', title: 'New title', abstract: 'Abstract' },
      update: { title: 'New title', abstract: 'Abstract' },
    })
  })

  test('moves the version forward on every save', async () => {
    await updatePublication('research-1', publicationUpdateSchema.parse(updateBody))

    const [args] = tx.research.updateMany.mock.calls[0] ?? []
    expect(args.data.updatedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
  })

  test('replaces the author links in the order given', async () => {
    await updatePublication('research-1', publicationUpdateSchema.parse(updateBody))

    expect(tx.researchCrossAuthor.deleteMany).toHaveBeenCalledWith({
      where: { researchId: 'research-1' },
    })
    expect(tx.researchCrossAuthor.create).toHaveBeenNthCalledWith(1, {
      data: { researchId: 'research-1', researchAuthorId: 'author-Juan Pérez', position: 0 },
    })
  })

  test('reports a publication that does not exist', async () => {
    tx.research.findUnique.mockResolvedValue(null)

    await expect(
      updatePublication('missing', publicationUpdateSchema.parse(updateBody)),
    ).resolves.toEqual({ ok: false, reason: 'not-found' })
    expect(tx.research.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when the publication changed since the editor loaded it', async () => {
    const stale = { ...updateBody, version: '2026-08-01T00:00:00.000Z' }

    await expect(
      updatePublication('research-1', publicationUpdateSchema.parse(stale)),
    ).resolves.toEqual({ ok: false, reason: 'conflict' })
    expect(tx.publisher.upsert).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save wins between the check and the write', async () => {
    tx.research.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      updatePublication('research-1', publicationUpdateSchema.parse(updateBody)),
    ).resolves.toEqual({ ok: false, reason: 'conflict' })
    expect(tx.researchTranslation.upsert).not.toHaveBeenCalled()
  })

  test('refuses a change in one language until the other is reviewed', async () => {
    const oneSided = {
      ...updateBody,
      content: { ...updateBody.content, es: { title: 'Título nuevo', abstract: 'Resumen' } },
    }

    await expect(
      updatePublication('research-1', publicationUpdateSchema.parse(oneSided)),
    ).resolves.toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(tx.research.updateMany).not.toHaveBeenCalled()
  })

  test('saves a change in one language once the other is confirmed for this operation', async () => {
    const confirmed = {
      ...updateBody,
      content: { ...updateBody.content, es: { title: 'Título nuevo', abstract: 'Resumen' } },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    }

    const result = await updatePublication('research-1', publicationUpdateSchema.parse(confirmed))

    expect(result.ok).toBe(true)
  })

  test('requires reviewing the base text when a legacy record gets its English text', async () => {
    tx.research.findUnique.mockResolvedValue({
      title: 'Título',
      abstract: 'Resumen',
      updatedAt: new Date(VERSION),
      translations: [],
    })

    const result = await updatePublication('research-1', publicationUpdateSchema.parse(updateBody))

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [
        { locale: 'es', field: 'title' },
        { locale: 'es', field: 'abstract' },
      ],
    })
  })

  test('reports a duplicate DOI', async () => {
    tx.research.updateMany.mockRejectedValue(uniqueViolation({ target: ['doi'] }))

    await expect(
      updatePublication('research-1', publicationUpdateSchema.parse(updateBody)),
    ).resolves.toEqual({ ok: false, reason: 'duplicate', field: 'doi' })
  })
})

describe('updatePublication: shared fields only', () => {
  test('writes only the shared fields sent, conditioned on the version', async () => {
    const result = await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({ version: VERSION, DOI: '10.5555/new' }),
    )

    expect(result.ok).toBe(true)
    expect(tx.research.updateMany).toHaveBeenCalledWith({
      where: { id: 'research-1', updatedAt: new Date(VERSION) },
      data: { doi: '10.5555/new', updatedAt: expect.any(Date) },
    })
  })

  test('never touches titles, abstracts, translations, authors or the publisher', async () => {
    await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({ version: VERSION, researchGroup: 'ROSAC' }),
    )

    const [args] = tx.research.updateMany.mock.calls[0] ?? []
    expect(args.data).not.toHaveProperty('title')
    expect(args.data).not.toHaveProperty('abstract')
    expect(tx.researchTranslation.upsert).not.toHaveBeenCalled()
    expect(tx.researchCrossAuthor.deleteMany).not.toHaveBeenCalled()
    expect(tx.publisher.upsert).not.toHaveBeenCalled()
  })

  test('does not ask a legacy record for its missing translation', async () => {
    tx.research.findUnique.mockResolvedValue({
      title: 'Base title',
      abstract: 'Base abstract',
      updatedAt: new Date(VERSION),
      translations: [],
    })

    const result = await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({ version: VERSION, href: 'https://example.org/new' }),
    )

    expect(result.ok).toBe(true)
    expect(tx.researchTranslation.upsert).not.toHaveBeenCalled()
  })

  test('clears an optional field sent as null', async () => {
    await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({ version: VERSION, href: null }),
    )

    expect(tx.research.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { externalUrl: null, updatedAt: expect.any(Date) } }),
    )
  })

  test('updates the publisher and authors when they are sent', async () => {
    await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({
        version: VERSION,
        venue: 'Astrophysical Journal',
        authors: ['Ana'],
      }),
    )

    expect(tx.publisher.upsert).toHaveBeenCalledWith({
      where: { name: 'Astrophysical Journal' },
      update: {},
      create: { name: 'Astrophysical Journal' },
    })
    expect(tx.researchCrossAuthor.create).toHaveBeenCalledTimes(1)
  })

  test('still reports a conflict against an older version', async () => {
    const result = await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({ version: '2026-08-01T00:00:00.000Z', DOI: null }),
    )

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.research.updateMany).not.toHaveBeenCalled()
  })
})

describe('updatePublication: changes started from English', () => {
  test('refuses an English-only change until the Spanish text is reviewed', async () => {
    const result = await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({
        ...updateBody,
        content: { ...updateBody.content, en: { title: 'Title', abstract: 'Better abstract' } },
      }),
    )

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'es', field: 'abstract' }],
    })
  })

  test('saves it once the Spanish text is confirmed, without editing it', async () => {
    const result = await updatePublication(
      'research-1',
      publicationUpdateSchema.parse({
        ...updateBody,
        content: { ...updateBody.content, en: { title: 'Title', abstract: 'Better abstract' } },
        confirmedUnchanged: [{ locale: 'es', field: 'abstract' }],
      }),
    )

    expect(result.ok).toBe(true)
    expect(tx.research.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Título', abstract: 'Resumen' }),
      }),
    )
  })
})

describe('deletePublication', () => {
  test('deletes an existing publication', async () => {
    prisma.research.findUnique.mockResolvedValue({ id: 'research-1' })

    await expect(deletePublication('research-1')).resolves.toBe(true)
    expect(prisma.research.delete).toHaveBeenCalledWith({ where: { id: 'research-1' } })
  })

  test('reports a publication that does not exist', async () => {
    prisma.research.findUnique.mockResolvedValue(null)

    await expect(deletePublication('missing')).resolves.toBe(false)
    expect(prisma.research.delete).not.toHaveBeenCalled()
  })
})
