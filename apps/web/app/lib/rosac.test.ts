import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()
const findUnique = vi.fn()
const findFirst = vi.fn()
const update = vi.fn()
const updateMany = vi.fn()
const create = vi.fn()
const del = vi.fn()
const aggregate = vi.fn()
const upsert = vi.fn()
const auditCreate = vi.fn()

const prismaMock = {
  researcher: { findMany, findUnique, update, updateMany, create, delete: del, deleteMany: del },
  rosacCharacteristic: { findMany, findFirst, findUnique, update, updateMany },
  rosacCharacteristicTranslation: { upsert },
  rosacActivity: { findMany, findFirst, findUnique, update, updateMany },
  rosacActivityTranslation: { upsert },
  rosacStage: { findMany, findFirst, findUnique, update, updateMany },
  rosacStageTranslation: { upsert },
  rosacInstrument: {
    findMany,
    findFirst,
    findUnique,
    update,
    updateMany,
    create,
    delete: del,
    aggregate,
  },
  rosacInstrumentTranslation: { upsert },
  rosacAcknowledgment: {
    findMany,
    findFirst,
    findUnique,
    update,
    updateMany,
    create,
    delete: del,
    aggregate,
  },
  auditEvent: { create: auditCreate },
  $transaction: vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock)),
}

vi.mock('@lasce/db', () => ({
  prisma: prismaMock,
}))

const {
  createResearcher,
  deleteResearcher,
  getResearchers,
  researcherInputSchema,
  updateResearcher,
  getRosacInfoContent,
  rosacInfoContent,
  rosacInfoMeta,
  getRosacCharacteristics,
  updateRosacCharacteristic,
  rosacCharacteristicInputSchema,
  getRosacActivities,
  updateRosacActivity,
  rosacActivityInputSchema,
  getRosacStages,
  updateRosacStage,
  rosacStageInputSchema,
  getRosacInstruments,
  createRosacInstrument,
  updateRosacInstrument,
  deleteRosacInstrument,
  rosacInstrumentInputSchema,
  getRosacAcknowledgments,
  createRosacAcknowledgment,
  updateRosacAcknowledgment,
  deleteRosacAcknowledgment,
  rosacAcknowledgmentInputSchema,
  safeUrlSchema,
  RosacConflictError,
  RosacReviewRequiredError,
} = await import('./rosac')
const { getMessages } = await import('./i18n/messages')

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
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const actor = { id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getResearchers', () => {
  test('maps each row to a TeamMember, dropping a missing email to undefined', async () => {
    findMany.mockResolvedValue([researcherRow({ email: [] })])

    const researchers = await getResearchers()

    expect(researchers).toEqual([
      {
        id: 'researcher-1',
        src: '/images/ROSAC/team/CarolinaSalas.jpg',
        role: 'Investigadora principal',
        name: 'Dra. Carolina Salas Matamoros',
        institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
        email: undefined,
        description: 'Responsable de la planificación estratégica.',
      },
    ])
  })

  test('keeps a real email when the row has one', async () => {
    findMany.mockResolvedValue([researcherRow()])

    const [researcher] = await getResearchers()

    expect(researcher?.email).toEqual(['carolina.salas_mata@ucr.ac.cr'])
  })

  test('orders by createdAt, so editing a profile never reorders it', async () => {
    findMany.mockResolvedValue([])

    await getResearchers()

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
  })

  test('maps a row without a photo to an empty src', async () => {
    findMany.mockResolvedValue([researcherRow({ photoUrl: null })])

    const [researcher] = await getResearchers()

    expect(researcher?.src).toBe('')
  })
})

describe('researcherInputSchema', () => {
  const validInput = {
    src: '/images/ROSAC/team/Someone.jpg',
    role: 'Investigador',
    name: 'Alguien',
    institution: 'UCR',
    description: 'Texto de prueba.',
  }

  test('accepts a well-formed input', () => {
    expect(researcherInputSchema.safeParse(validInput).success).toBe(true)
  })

  test('accepts an empty photo — the photo is optional', () => {
    expect(researcherInputSchema.safeParse({ ...validInput, src: '' }).success).toBe(true)
  })

  test('accepts a missing photo', () => {
    const { src: _src, ...withoutPhoto } = validInput

    expect(researcherInputSchema.safeParse(withoutPhoto).success).toBe(true)
  })

  test('rejects an empty required field', () => {
    const result = researcherInputSchema.safeParse({ ...validInput, name: '  ' })

    expect(result.success).toBe(false)
  })

  test('accepts an empty email — no public address', () => {
    expect(researcherInputSchema.safeParse({ ...validInput, email: '' }).success).toBe(true)
  })

  test('accepts a well-formed email', () => {
    expect(
      researcherInputSchema.safeParse({ ...validInput, email: 'alguien@ucr.ac.cr' }).success,
    ).toBe(true)
  })

  test('rejects a malformed email', () => {
    const result = researcherInputSchema.safeParse({ ...validInput, email: 'not-an-email' })

    expect(result.success).toBe(false)
  })

  test('splits a comma-separated list into several addresses', () => {
    const result = researcherInputSchema.safeParse({
      ...validInput,
      email: 'uno@ucr.ac.cr, dos@ucr.ac.cr',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toEqual(['uno@ucr.ac.cr', 'dos@ucr.ac.cr'])
    }
  })

  test('rejects the list when any address in it is malformed', () => {
    const result = researcherInputSchema.safeParse({
      ...validInput,
      email: 'uno@ucr.ac.cr, not-an-email',
    })

    expect(result.success).toBe(false)
  })

  test('rejects more than 2 addresses', () => {
    const result = researcherInputSchema.safeParse({
      ...validInput,
      email: 'uno@ucr.ac.cr, dos@ucr.ac.cr, tres@ucr.ac.cr',
    })

    expect(result.success).toBe(false)
  })

  test('accepts a missing description — optional', () => {
    const { description: _description, ...withoutDescription } = validInput

    expect(researcherInputSchema.safeParse(withoutDescription).success).toBe(true)
  })
})

describe('updateResearcher', () => {
  const updateInput = {
    src: '/images/ROSAC/team/Updated.jpg',
    role: 'Investigador asociado',
    name: 'Nuevo nombre',
    email: ['nuevo.nombre@ucr.ac.cr'],
    institution: 'UCR',
    description: 'Texto actualizado.',
  }

  test('returns null without writing when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await updateResearcher('missing-id', updateInput, 'admin-1')

    expect(result).toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  test('persists the change, including the email', async () => {
    findUnique.mockResolvedValue(researcherRow())
    update.mockResolvedValue(
      researcherRow({
        photoUrl: updateInput.src,
        role: updateInput.role,
        name: updateInput.name,
        email: updateInput.email,
        description: updateInput.description,
      }),
    )

    const result = await updateResearcher('researcher-1', updateInput, 'admin-1')

    expect(update).toHaveBeenCalledWith({
      where: { id: 'researcher-1' },
      data: {
        photoUrl: updateInput.src,
        role: updateInput.role,
        name: updateInput.name,
        email: updateInput.email,
        institution: updateInput.institution,
        description: updateInput.description,
        modifiedBy: 'admin-1',
      },
    })
    expect(result?.name).toBe('Nuevo nombre')
    expect(result?.email).toEqual(['nuevo.nombre@ucr.ac.cr'])
  })

  test('persists several addresses', async () => {
    findUnique.mockResolvedValue(researcherRow())
    const emails = ['uno@ucr.ac.cr', 'dos@ucr.ac.cr']
    update.mockResolvedValue(researcherRow({ email: emails }))

    const result = await updateResearcher(
      'researcher-1',
      { ...updateInput, email: emails },
      'admin-1',
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: emails }) }),
    )
    expect(result?.email).toEqual(emails)
  })

  test('clears the email when the form submits none', async () => {
    findUnique.mockResolvedValue(researcherRow())
    update.mockResolvedValue(researcherRow({ email: [] }))

    await updateResearcher('researcher-1', { ...updateInput, email: [] }, 'admin-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: [] }) }),
    )
  })

  test('stores a cleared photo as null', async () => {
    findUnique.mockResolvedValue(researcherRow())
    update.mockResolvedValue(researcherRow({ photoUrl: null }))

    const result = await updateResearcher('researcher-1', { ...updateInput, src: '' }, 'admin-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ photoUrl: null }) }),
    )
    expect(result?.src).toBe('')
  })
})

describe('createResearcher', () => {
  test('creates the profile, authored by the given user, with no email', async () => {
    const createInput = {
      src: '/images/ROSAC/team/New.jpg',
      role: 'Investigador',
      name: 'Persona Nueva',
      institution: 'UCR',
      description: 'Texto de prueba.',
    }
    create.mockResolvedValue(
      researcherRow({
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        description: createInput.description,
        email: [],
      }),
    )

    const result = await createResearcher(createInput, 'admin-1')

    expect(create).toHaveBeenCalledWith({
      data: {
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        email: [],
        institution: createInput.institution,
        description: createInput.description,
        modifiedBy: 'admin-1',
      },
    })
    expect(result.email).toBeUndefined()
  })

  test('creates the profile with the given email', async () => {
    const createInput = {
      src: '/images/ROSAC/team/New.jpg',
      role: 'Investigador',
      name: 'Persona Nueva',
      email: ['persona.nueva@ucr.ac.cr'],
      institution: 'UCR',
      description: 'Texto de prueba.',
    }
    create.mockResolvedValue(researcherRow({ email: createInput.email }))

    const result = await createResearcher(createInput, 'admin-1')

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: createInput.email }) }),
    )
    expect(result.email).toEqual(createInput.email)
  })

  test('creates the profile without a photo, stored as null', async () => {
    const createInput = {
      role: 'Investigador',
      name: 'Persona Nueva',
      institution: 'UCR',
    }
    create.mockResolvedValue(researcherRow({ photoUrl: null }))

    const result = await createResearcher(createInput, 'admin-1')

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ photoUrl: null }) }),
    )
    expect(result.src).toBe('')
  })
})

describe('deleteResearcher', () => {
  test('returns false without deleting when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await deleteResearcher('missing-id', actor)

    expect(result).toBe(false)
    expect(del).not.toHaveBeenCalled()
  })

  test('deletes the row and returns true when it exists', async () => {
    findUnique.mockResolvedValue(researcherRow())
    del.mockResolvedValue({ count: 1 })

    const result = await deleteResearcher('researcher-1', actor)

    expect(del).toHaveBeenCalledWith({ where: { id: 'researcher-1' } })
    expect(result).toBe(true)
    expect(auditCreate).toHaveBeenCalledWith({
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
    expect(english.team.people[0]?.role).toBe('Investigadora principal')
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

describe('rosac characteristics CRUD and validation', () => {
  test('validates characteristic input schema', () => {
    expect(
      rosacCharacteristicInputSchema.safeParse({
        icon: 'antenna',
        title: 'Antena 11m',
        description: 'Descripción',
      }).success,
    ).toBe(true)

    expect(
      rosacCharacteristicInputSchema.safeParse({
        icon: 'invalid',
        title: 'Antena 11m',
        description: 'Descripción',
      }).success,
    ).toBe(false)

    expect(
      rosacCharacteristicInputSchema.safeParse({
        icon: 'antenna',
        title: '   ',
        description: 'Descripción',
      }).success,
    ).toBe(false)
  })

  test('getRosacCharacteristics returns mapped rows when rows exist', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000010',
        key: 'antenna',
        icon: 'antenna',
        title: 'Antena de 11 metros',
        description: 'Descripción de la antena',
        updatedAt: new Date(),
        translations: [],
      },
    ])
    const items = await getRosacCharacteristics('es')
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Antena de 11 metros')
  })

  test('updateRosacCharacteristic returns null when key or id does not exist', async () => {
    findFirst.mockResolvedValueOnce(null)
    const result = await updateRosacCharacteristic('no-such-id', {
      icon: 'antenna',
      title: 'Antena',
      description: 'Desc',
    })
    expect(result).toBeNull()
  })

  test('updateRosacCharacteristic updates existing row and returns it', async () => {
    const existingRow = {
      id: '00000000-0000-0000-0000-000000000010',
      key: 'antenna',
      icon: 'antenna',
      title: 'Viejo título',
      description: 'Vieja desc',
      updatedAt: new Date(),
      translations: [],
    }
    findFirst.mockResolvedValueOnce(existingRow)
    update.mockResolvedValueOnce(existingRow)
    findUnique.mockResolvedValueOnce({
      ...existingRow,
      title: 'Nuevo título',
      description: 'Nueva desc',
    })

    const result = await updateRosacCharacteristic('antenna', {
      icon: 'antenna',
      title: 'Nuevo título',
      description: 'Nueva desc',
    })

    expect(result).not.toBeNull()
    expect(result?.title).toBe('Nuevo título')
  })
})

describe('rosac activities CRUD and validation', () => {
  test('validates activity input schema', () => {
    expect(
      rosacActivityInputSchema.safeParse({
        icon: 'tracking',
        title: 'Seguimiento',
        description: 'Descripción de la actividad',
      }).success,
    ).toBe(true)

    expect(
      rosacActivityInputSchema.safeParse({
        icon: 'tracking',
        title: '',
        description: 'Descripción',
      }).success,
    ).toBe(false)
  })

  test('updateRosacActivity returns null when record is missing', async () => {
    findFirst.mockResolvedValueOnce(null)
    const result = await updateRosacActivity('missing-key', {
      icon: 'tracking',
      title: 'Seguimiento',
      description: 'Desc',
    })
    expect(result).toBeNull()
  })

  test('updateRosacActivity updates existing record', async () => {
    const existing = {
      id: '00000000-0000-0000-0000-000000000020',
      key: 'tracking',
      icon: 'tracking',
      title: 'Antiguo',
      description: 'Antiguo',
      updatedAt: new Date(),
      translations: [],
    }
    findFirst.mockResolvedValueOnce(existing)
    update.mockResolvedValueOnce(existing)
    findUnique.mockResolvedValueOnce({
      ...existing,
      title: 'Nuevo',
    })

    const result = await updateRosacActivity('tracking', {
      icon: 'tracking',
      title: 'Nuevo',
      description: 'Antiguo',
    })
    expect(result?.title).toBe('Nuevo')
  })

  test('getRosacActivities returns mapped activities', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000021',
        key: 'tracking',
        icon: 'tracking',
        title: 'Seguimiento',
        description: 'Desc',
        updatedAt: new Date(),
        translations: [],
      },
    ])
    const items = await getRosacActivities('es')
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Seguimiento')
  })
})

describe('rosac construction stages CRUD and validation', () => {
  test('validates stage input schema', () => {
    expect(
      rosacStageInputSchema.safeParse({
        title: 'Preparación',
        description: 'Descripción de la etapa',
        images: [{ src: '/img.jpg', alt: 'Alt' }],
      }).success,
    ).toBe(true)

    expect(
      rosacStageInputSchema.safeParse({
        title: '',
        description: 'Descripción',
      }).success,
    ).toBe(false)
  })

  test('updateRosacStage returns null when not found', async () => {
    findFirst.mockResolvedValueOnce(null)
    const result = await updateRosacStage('stage-missing', {
      title: 'Etapa',
      description: 'Desc',
    })
    expect(result).toBeNull()
  })

  test('getRosacStages returns mapped stages', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000031',
        key: 'preparation',
        title: 'Preparación',
        description: 'Desc',
        images: [],
        updatedAt: new Date(),
        translations: [],
      },
    ])
    const stages = await getRosacStages('es')
    expect(stages).toHaveLength(1)
    expect(stages[0]?.title).toBe('Preparación')
  })
})

describe('rosac instruments CRUD and validation', () => {
  test('rejects javascript: URL in consultation href', () => {
    expect(
      rosacInstrumentInputSchema.safeParse({
        name: 'Instrumento',
        consultation: { label: 'Consultar', href: 'javascript:alert(1)' },
      }).success,
    ).toBe(false)
  })

  test('accepts valid http and https consultation href', () => {
    expect(
      rosacInstrumentInputSchema.safeParse({
        name: 'Instrumento',
        consultation: { label: 'Consultar', href: 'https://ejemplo.ucr.ac.cr' },
      }).success,
    ).toBe(true)
  })

  test('updateRosacInstrument returns null for non-UUID id', async () => {
    const result = await updateRosacInstrument('not-a-uuid', {
      name: 'Instrumento',
    })
    expect(result).toBeNull()
  })

  test('updateRosacInstrument returns null when UUID not found in database', async () => {
    findUnique.mockResolvedValueOnce(null)
    const result = await updateRosacInstrument('00000000-0000-0000-0000-000000000000', {
      name: 'Instrumento',
    })
    expect(result).toBeNull()
  })

  test('deleteRosacInstrument returns false for non-UUID id or when not found', async () => {
    expect(await deleteRosacInstrument('not-a-uuid')).toBe(false)

    findUnique.mockResolvedValueOnce(null)
    expect(await deleteRosacInstrument('00000000-0000-0000-0000-000000000000')).toBe(false)
  })

  test('deleteRosacInstrument deletes existing instrument and returns true', async () => {
    const existing = { id: '00000000-0000-0000-0000-000000000001' }
    findUnique.mockResolvedValueOnce(existing)
    del.mockResolvedValueOnce(existing)

    expect(await deleteRosacInstrument('00000000-0000-0000-0000-000000000001')).toBe(true)
  })

  test('getRosacInstruments returns mapped instruments', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000041',
        name: 'Polarímetro',
        pendingMessage: null,
        imageSrc: null,
        imageAlt: null,
        consultationHref: null,
        consultationLabel: null,
        consultationNotice: null,
        updatedAt: new Date(),
        translations: [],
      },
    ])
    const instruments = await getRosacInstruments('es')
    expect(instruments).toHaveLength(1)
    expect(instruments[0]?.name).toBe('Polarímetro')
  })

  test('createRosacInstrument creates a new instrument', async () => {
    aggregate.mockResolvedValueOnce({ _max: { position: 2 } })
    const createdRow = {
      id: '00000000-0000-0000-0000-000000000042',
      name: 'Nuevo Instrumento',
      pendingMessage: null,
      imageSrc: null,
      imageAlt: null,
      consultationHref: null,
      consultationLabel: null,
      consultationNotice: null,
      updatedAt: new Date(),
      translations: [],
    }
    create.mockResolvedValueOnce(createdRow)
    findUnique.mockResolvedValueOnce(createdRow)

    const created = await createRosacInstrument({ name: 'Nuevo Instrumento' })
    expect(created.name).toBe('Nuevo Instrumento')
  })
})

describe('rosac acknowledgments CRUD and validation', () => {
  test('rejects javascript: URL in href', () => {
    expect(
      rosacAcknowledgmentInputSchema.safeParse({
        name: 'Institución',
        href: 'javascript:alert(1)',
        logo: { src: '/logo.png', alt: 'Logo' },
      }).success,
    ).toBe(false)
  })

  test('accepts valid http and https href', () => {
    expect(
      rosacAcknowledgmentInputSchema.safeParse({
        name: 'Institución',
        href: 'https://ucr.ac.cr',
        logo: { src: '/logo.png', alt: 'Logo' },
      }).success,
    ).toBe(true)
  })

  test('updateRosacAcknowledgment returns null for non-UUID id', async () => {
    const result = await updateRosacAcknowledgment('non-uuid-name', {
      name: 'Institución',
      logo: { src: '/logo.png', alt: 'Logo' },
    })
    expect(result).toBeNull()
  })

  test('updateRosacAcknowledgment returns null when UUID not found', async () => {
    findUnique.mockResolvedValueOnce(null)
    const result = await updateRosacAcknowledgment('00000000-0000-0000-0000-000000000000', {
      name: 'Institución',
      logo: { src: '/logo.png', alt: 'Logo' },
    })
    expect(result).toBeNull()
  })

  test('deleteRosacAcknowledgment returns false for non-UUID id', async () => {
    expect(await deleteRosacAcknowledgment('some-name')).toBe(false)
  })

  test('deleteRosacAcknowledgment returns false when UUID not found', async () => {
    findUnique.mockResolvedValueOnce(null)
    expect(await deleteRosacAcknowledgment('00000000-0000-0000-0000-000000000000')).toBe(false)
  })

  test('deleteRosacAcknowledgment deletes existing row and returns true', async () => {
    const existing = { id: '00000000-0000-0000-0000-000000000002' }
    findUnique.mockResolvedValueOnce(existing)
    del.mockResolvedValueOnce(existing)

    expect(await deleteRosacAcknowledgment('00000000-0000-0000-0000-000000000002')).toBe(true)
  })

  test('getRosacAcknowledgments returns mapped acknowledgments', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000051',
        name: 'INAOE',
        href: 'https://inaoe.mx',
        logoSrc: '/images/inaoe.webp',
        logoAlt: 'Logo INAOE',
      },
    ])
    const acks = await getRosacAcknowledgments()
    expect(acks).toHaveLength(1)
    expect(acks[0]?.name).toBe('INAOE')
  })

  test('createRosacAcknowledgment creates a new acknowledgment', async () => {
    aggregate.mockResolvedValueOnce({ _max: { position: 5 } })
    const createdRow = {
      id: '00000000-0000-0000-0000-000000000052',
      name: 'Nueva Institución',
      href: 'https://ejemplo.ucr.ac.cr',
      logoSrc: '/images/logo.webp',
      logoAlt: 'Logo Institución',
    }
    create.mockResolvedValueOnce(createdRow)

    const created = await createRosacAcknowledgment({
      name: 'Nueva Institución',
      href: 'https://ejemplo.ucr.ac.cr',
      logo: { src: '/images/logo.webp', alt: 'Logo Institución' },
    })
    expect(created.name).toBe('Nueva Institución')
  })
})

describe('safeUrlSchema', () => {
  test('accepts valid relative URLs starting with a single slash', () => {
    expect(safeUrlSchema.safeParse('/datos?source=ROSAC').success).toBe(true)
    expect(safeUrlSchema.safeParse('/contacto').success).toBe(true)
  })

  test('accepts valid http and https URLs', () => {
    expect(safeUrlSchema.safeParse('https://example.com/test').success).toBe(true)
    expect(safeUrlSchema.safeParse('http://example.org').success).toBe(true)
  })

  test('rejects protocol-relative URLs', () => {
    expect(safeUrlSchema.safeParse('//external.example').success).toBe(false)
    expect(safeUrlSchema.safeParse('//example.com/path').success).toBe(false)
  })

  test('rejects javascript: and other dangerous schemes', () => {
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
    expect(safeUrlSchema.safeParse('data:text/html,<script>').success).toBe(false)
  })
})

describe('rosac optimistic concurrency and reviews', () => {
  const staleDate = new Date('2026-01-01T00:00:00.000Z')
  const currentDate = new Date('2026-01-02T00:00:00.000Z')
  const staleVersion = '2026-01-01T00:00:00.000Z'

  test('updateRosacCharacteristic throws RosacConflictError when version is stale', async () => {
    findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000010',
      key: 'antenna',
      icon: 'antenna',
      title: 'Antena',
      description: 'Desc',
      updatedAt: currentDate,
      translations: [],
    })

    await expect(
      updateRosacCharacteristic('antenna', {
        version: staleVersion,
        title: 'Nuevo título',
        description: 'Nueva desc',
      }),
    ).rejects.toThrow(RosacConflictError)
  })

  test('updateRosacCharacteristic throws RosacConflictError when updateMany affects 0 rows', async () => {
    findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000010',
      key: 'antenna',
      icon: 'antenna',
      title: 'Antena',
      description: 'Desc',
      updatedAt: staleDate,
      translations: [],
    })
    updateMany.mockResolvedValueOnce({ count: 0 })

    await expect(
      updateRosacCharacteristic('antenna', {
        version: staleVersion,
        title: 'Nuevo título',
        description: 'Nueva desc',
      }),
    ).rejects.toThrow(RosacConflictError)
  })

  test('updateRosacCharacteristic throws RosacReviewRequiredError when review is missing', async () => {
    findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000010',
      key: 'antenna',
      icon: 'antenna',
      title: 'Antena',
      description: 'Desc',
      updatedAt: staleDate,
      translations: [
        {
          locale: 'en',
          title: 'Antenna',
          description: 'Desc EN',
        },
      ],
    })

    await expect(
      updateRosacCharacteristic('antenna', {
        content: {
          es: { title: 'Antena Editada', description: 'Desc' },
          en: { title: 'Antenna', description: 'Desc EN' },
        },
      }),
    ).rejects.toThrow(RosacReviewRequiredError)
  })

  test('updateRosacActivity throws RosacConflictError when version is stale', async () => {
    findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000020',
      key: 'tracking',
      icon: 'tracking',
      title: 'Seguimiento',
      description: 'Desc',
      updatedAt: currentDate,
      translations: [],
    })

    await expect(
      updateRosacActivity('tracking', {
        version: staleVersion,
        title: 'Nuevo',
        description: 'Desc',
      }),
    ).rejects.toThrow(RosacConflictError)
  })

  test('updateRosacStage throws RosacConflictError when version is stale', async () => {
    findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000030',
      key: 'preparacion',
      title: 'Preparación',
      description: 'Desc',
      images: [],
      updatedAt: currentDate,
      translations: [],
    })

    await expect(
      updateRosacStage('preparacion', {
        version: staleVersion,
        title: 'Nuevo',
        description: 'Desc',
      }),
    ).rejects.toThrow(RosacConflictError)
  })

  test('updateRosacInstrument throws RosacConflictError when version is stale', async () => {
    findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000040',
      name: 'Instrumento',
      pendingMessage: null,
      imageSrc: null,
      imageAlt: null,
      consultationHref: null,
      consultationLabel: 'Ver',
      consultationNotice: null,
      updatedAt: currentDate,
      translations: [],
    })

    await expect(
      updateRosacInstrument('00000000-0000-0000-0000-000000000040', {
        version: staleVersion,
        name: 'Nuevo Nombre',
      }),
    ).rejects.toThrow(RosacConflictError)
  })
})
