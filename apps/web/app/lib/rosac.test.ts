import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()
const findUnique = vi.fn()
const update = vi.fn()
const create = vi.fn()
const del = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: { researcher: { findMany, findUnique, update, create, delete: del } },
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

    const result = await deleteResearcher('missing-id')

    expect(result).toBe(false)
    expect(del).not.toHaveBeenCalled()
  })

  test('deletes the row and returns true when it exists', async () => {
    findUnique.mockResolvedValue(researcherRow())

    const result = await deleteResearcher('researcher-1')

    expect(del).toHaveBeenCalledWith({ where: { id: 'researcher-1' } })
    expect(result).toBe(true)
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
    expect(english.activities.title).toBe('What do we develop at ROSAC?')
    expect(english.construction.title).toBe('ROSAC construction')
    expect(english.construction.carousel?.ofPreposition).toBe('of')
    expect(english.construction.carousel?.photoNoun).toBe('Photograph')
    expect(english.radioObservation.title).toBe('Why observe in radio?')
    expect(english.relationship.title).toBe('ROSAC and LASCE')
    expect(english.instruments.title).toBe('Scientific instruments')
    expect(english.instruments.items[0]?.name).toBe('ROSAC-SABER')
    expect(english.instruments.items[0]?.characteristics).toEqual(['Band between 100 and 1000 MHz'])
    expect(english.instruments.items[0]?.consultation?.label).toBe('Query ROSAC-SABER simulation')
    expect(english.instruments.items[1]?.characteristics).toEqual(['9 GHz band'])
    expect(english.instruments.items[1]?.consultation?.label).toBe(
      'Query ROSAC-MIRA 9GHz simulation',
    )
    expect(english.instruments.items[2]?.characteristics).toEqual([
      'Neutral hydrogen observation at 1.4 GHz',
    ])
    expect(english.instruments.items[2]?.consultation?.label).toBe('Query ROSAC-HIROS simulation')
    expect(english.team.title).toBe('Researchers')
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
