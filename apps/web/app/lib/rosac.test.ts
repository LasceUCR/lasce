import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {}

  const tx = {
    researcher: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    researcherTranslation: { upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  }

  const prisma = {
    researcher: { findMany: vi.fn(), deleteMany: vi.fn(), create: tx.researcher.create },
    $transaction: vi.fn(),
  }

  return { tx, prisma, PrismaClientKnownRequestError }
})

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const { tx, prisma } = mocks
const { findMany } = prisma.researcher

const {
  createResearcher,
  deleteResearcher,
  getResearchers,
  rosacResearcherCreateSchema,
  rosacResearcherUpdateSchema,
  updateResearcher,
  getRosacInfoContent,
  rosacInfoContent,
  rosacInfoMeta,
} = await import('./rosac')
const { getMessages } = await import('./i18n/messages')

const VERSION = '2026-01-01T00:00:00.000Z'

function researcherRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'researcher-1',
    photoUrl: '/images/ROSAC/team/CarolinaSalas.jpg',
    role: 'Investigadora principal',
    name: 'Dra. Carolina Salas Matamoros',
    institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    email: ['carolina.salas_mata@ucr.ac.cr'],
    description: 'Responsable de la planificación estratégica.',
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    modifiedAt: new Date(VERSION),
    translations: [
      {
        locale: 'en',
        role: 'Principal Investigator',
        description: 'Head of strategic planning.',
      },
    ],
    ...overrides,
  }
}

const actor = { id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
    callback(tx),
  )
})

describe('getResearchers', () => {
  test('maps each row to a TeamMember, dropping a missing email to undefined', async () => {
    findMany.mockResolvedValue([researcherRow({ email: [] })])

    const researchers = await getResearchers('es')

    expect(researchers).toEqual([
      {
        id: 'researcher-1',
        src: '/images/ROSAC/team/CarolinaSalas.jpg',
        role: 'Investigadora principal',
        name: 'Dra. Carolina Salas Matamoros',
        institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
        email: undefined,
        description: 'Responsable de la planificación estratégica.',
        contentLocale: 'es',
      },
    ])
  })

  test('keeps a real email when the row has one', async () => {
    findMany.mockResolvedValue([researcherRow()])

    const [researcher] = await getResearchers('es')

    expect(researcher?.email).toEqual(['carolina.salas_mata@ucr.ac.cr'])
  })

  test('orders by createdAt, so editing a profile never reorders it', async () => {
    findMany.mockResolvedValue([])

    await getResearchers('es')

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
      include: expect.anything(),
    })
  })

  test('maps a row without a photo to an empty src', async () => {
    findMany.mockResolvedValue([researcherRow({ photoUrl: null })])

    const [researcher] = await getResearchers('es')

    expect(researcher?.src).toBe('')
  })
})

describe('rosacResearcherCreateSchema and UpdateSchema', () => {
  const validCreateInput = {
    src: '/images/ROSAC/team/Someone.jpg',
    name: 'Alguien',
    institution: 'UCR',
    email: ['alguien@ucr.ac.cr'],
    content: {
      es: { role: 'Investigador', description: 'Texto de prueba.' },
      en: { role: 'Researcher', description: 'Test text.' },
    },
  }

  test('accepts well-formed create input', () => {
    expect(rosacResearcherCreateSchema.safeParse(validCreateInput).success).toBe(true)
  })

  test('accepts well-formed update input', () => {
    expect(
      rosacResearcherUpdateSchema.safeParse({
        version: VERSION,
        content: validCreateInput.content,
      }).success,
    ).toBe(true)
  })
})

describe('updateResearcher', () => {
  const updateInput = {
    version: VERSION,
    content: {
      es: { role: 'Investigador principal', description: 'Responsable de la planificación.' },
      en: { role: 'Lead Researcher', description: 'Head of planning.' },
    },
    src: '/images/ROSAC/team/NewPhoto.jpg',
    name: 'Nuevo nombre',
    email: ['nuevo.nombre@ucr.ac.cr'],
    institution: 'UCR',
  }

  test('updates researcher in transaction and upserts translations', async () => {
    tx.researcher.findUnique.mockResolvedValue(researcherRow())
    tx.researcher.updateMany.mockResolvedValue({ count: 1 })
    tx.researcher.findUniqueOrThrow.mockResolvedValue(researcherRow({ name: 'Nuevo nombre' }))

    const result = await updateResearcher('researcher-1', updateInput, 'admin-1')

    expect(tx.researcher.updateMany).toHaveBeenCalledWith({
      where: { id: 'researcher-1', modifiedAt: new Date(VERSION) },
      data: expect.objectContaining({
        name: 'Nuevo nombre',
        role: 'Investigador principal',
        modifiedBy: 'admin-1',
      }),
    })
    expect(tx.researcherTranslation.upsert).toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, researcher: { id: 'researcher-1' } })
  })

  test('returns conflict when version does not match', async () => {
    tx.researcher.findUnique.mockResolvedValue(researcherRow())

    const result = await updateResearcher(
      'researcher-1',
      { ...updateInput, version: '2020-01-01T00:00:00.000Z' },
      'admin-1',
    )

    expect(result).toEqual({ ok: false, reason: 'conflict' })
  })
})

describe('createResearcher', () => {
  test('creates the profile with translations', async () => {
    const createInput = {
      src: '/images/ROSAC/team/New.jpg',
      name: 'Persona Nueva',
      institution: 'UCR',
      email: ['persona.nueva@ucr.ac.cr'],
      content: {
        es: { role: 'Investigador', description: 'Texto de prueba.' },
        en: { role: 'Researcher', description: 'Test text.' },
      },
    }
    prisma.researcher.create.mockResolvedValue(
      researcherRow({
        name: createInput.name,
        role: createInput.content.es.role,
        email: createInput.email,
      }),
    )

    const result = await createResearcher(createInput, 'admin-1')

    expect(prisma.researcher.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Persona Nueva',
        role: 'Investigador',
        modifiedBy: 'admin-1',
        translations: {
          create: expect.arrayContaining([
            expect.objectContaining({ locale: 'en', role: 'Researcher' }),
          ]),
        },
      }),
      include: expect.anything(),
    })
    expect(result.name).toBe('Persona Nueva')
  })
})

describe('deleteResearcher', () => {
  test('returns false without deleting when the id does not exist', async () => {
    tx.researcher.findUnique.mockResolvedValue(null)

    const result = await deleteResearcher('missing-id', actor)

    expect(result).toBe(false)
    expect(tx.researcher.deleteMany).not.toHaveBeenCalled()
  })

  test('returns false when no row was deleted', async () => {
    tx.researcher.findUnique.mockResolvedValue(researcherRow())
    tx.researcher.deleteMany.mockResolvedValue({ count: 0 })

    const result = await deleteResearcher('missing-id', actor)

    expect(result).toBe(false)
  })

  test('deletes the row and returns true when it exists', async () => {
    tx.researcher.findUnique.mockResolvedValue(researcherRow())
    tx.researcher.deleteMany.mockResolvedValue({ count: 1 })

    const result = await deleteResearcher('researcher-1', actor)

    expect(tx.researcher.deleteMany).toHaveBeenCalledWith({ where: { id: 'researcher-1' } })
    expect(result).toBe(true)
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'rosac_researcher.delete',
        summary: 'Investigador ROSAC eliminado: Dra. Carolina Salas Matamoros',
      }),
    })
  })
})

describe('rosac content', () => {
  test('exposes indexable metadata and Spanish copy by default', () => {
    expect(rosacInfoMeta.title).toBe('Radioastronomía y ROSAC | LASCE')
    expect(rosacInfoMeta.description).toMatch(/Radio Observatorio de Santa Cruz/i)
    expect(rosacInfoContent.hero.title).toBe('Radio Observatorio de Santa Cruz (ROSAC)')
    expect(rosacInfoContent.overview.title).toBe('¿Qué es ROSAC?')
    expect(rosacInfoContent.overview.paragraphs).toHaveLength(2)
    expect(rosacInfoContent.characteristics.title).toBe('Características principales')
    expect(rosacInfoContent.characteristics.items).toHaveLength(4)
    expect(rosacInfoContent.location.title).toBe('Ubicación')
    expect(rosacInfoContent.location.markerLabel).toBe('ROSAC')
    expect(rosacInfoContent.activities.title).toBe('¿Qué desarrollamos en ROSAC?')
    expect(rosacInfoContent.activities.items).toHaveLength(6)
    expect(rosacInfoContent.construction.title).toBe('Construcción del ROSAC')
    expect(rosacInfoContent.construction.stages).toHaveLength(5)
    expect(rosacInfoContent.radioObservation.title).toBe('¿Por qué observar en radio?')
    expect(rosacInfoContent.relationship.title).toBe('ROSAC y LASCE')
    expect(rosacInfoContent.instruments.title).toBe('Instrumentos científicos')
    expect(rosacInfoContent.instruments.items).toHaveLength(3)
    expect(rosacInfoContent.team.title).toBe('Investigadores')
    expect(rosacInfoContent.acknowledgments.title).toBe('Agradecimientos ROSAC')
    expect(rosacInfoContent.acknowledgments.institutions.length).toBeGreaterThan(0)
    expect(rosacInfoContent.donations.title).toBe('Donaciones ROSAC')
    expect(rosacInfoContent.donations.items).toHaveLength(2)
    expect(rosacInfoContent.backLink.href).toBe('/#areas-de-trabajo')
    expect(rosacInfoContent.backLink.label).toBe('Volver a las áreas')
  })

  test('localizes properly in English', () => {
    const english = getRosacInfoContent(getMessages('en'))

    expect(english.hero.kicker).toBe('LASCE work area')
    expect(english.hero.title).toBe('Santa Cruz Radio Observatory (ROSAC)')
    expect(english.overview.title).toBe('What is ROSAC?')
    expect(english.characteristics.title).toBe('Main characteristics')
    expect(english.location.title).toBe('Location')
    expect(english.location.labels.regionName).toBe('Location map of ROSAC')
    expect(english.location.labels.zoomInTitle).toBe('Zoom in')
    expect(english.location.labels.zoomOutTitle).toBe('Zoom out')
    expect(english.activities.title).toBe('What do we develop at ROSAC?')
    expect(english.construction.title).toBe('ROSAC construction')
    expect(english.construction.carousel?.ofPreposition).toBe('of')
    expect(english.construction.carousel?.photoNoun).toBe('Photograph')
    expect(english.radioObservation.title).toBe('Why observe in radio?')
    expect(english.relationship.title).toBe('ROSAC and LASCE')
    expect(english.instruments.title).toBe('Scientific instruments')
    expect(english.instruments.items[0]?.name).toBe('ROSAC-SABER')
    expect(english.instruments.items[0]?.characteristics).toEqual(['Band between 100 and 1000 MHz'])
    expect(english.instruments.items[0]?.consultation?.label).toBe('View ROSAC-SABER simulation')
    expect(english.instruments.items[1]?.characteristics).toEqual(['9 GHz band'])
    expect(english.instruments.items[1]?.consultation?.label).toBe(
      'View ROSAC-MIRA 9GHz simulation',
    )
    expect(english.instruments.items[2]?.characteristics).toEqual([
      'Neutral hydrogen observation at 1.4 GHz',
    ])
    expect(english.team.title).toBe('Researchers')
    expect(english.team.institutionLabel).toBe('Institution')
    expect(english.team.people[0]?.role).toBe('Principal Investigator')
    expect(english.characteristics.items[0]?.title).toBe('11-meter antenna')
    expect(english.construction.stages[0]?.title).toBe('Preparation for assembly')
    expect(english.construction.stages[4]?.title).toBe('Electrical installation')
    expect(english.acknowledgments.title).toBe('ROSAC acknowledgments')
    expect(english.donations.title).toBe('ROSAC donations')
    expect(english.donations.items[1]?.title).toBe('Prysmian donation')
    expect(english.donations.cta.buttonLabel).toBe('Contact us')
    expect(english.backLink.label).toBe('Back to work areas')
  })

  test('preserves structural parity and item identifiers across languages', () => {
    const english = getRosacInfoContent(getMessages('en'))

    expect(english.characteristics.items.map((i) => i.id)).toEqual(
      rosacInfoContent.characteristics.items.map((i) => i.id),
    )
    expect(english.activities.items.map((i) => i.id)).toEqual(
      rosacInfoContent.activities.items.map((i) => i.id),
    )
    expect(english.construction.stages.map((s) => s.id)).toEqual(
      rosacInfoContent.construction.stages.map((s) => s.id),
    )
    expect(english.instruments.items.map((i) => i.id)).toEqual(
      rosacInfoContent.instruments.items.map((i) => i.id),
    )
  })

  test('gracefully falls back when messages are partial or undefined', () => {
    const partial = getRosacInfoContent({} as never)

    expect(partial.hero.title).toBe(rosacInfoContent.hero.title)
    expect(partial.overview.title).toBe(rosacInfoContent.overview.title)
    expect(partial.construction.title).toBe(rosacInfoContent.construction.title)
    expect(partial.instruments.title).toBe(rosacInfoContent.instruments.title)
    expect(partial.backLink.label).toBe(rosacInfoContent.backLink.label)
  })
})
