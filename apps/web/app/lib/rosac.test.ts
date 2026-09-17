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
} = await import('./rosac')

function researcherRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'researcher-1',
    photoUrl: '/images/ROSAC/team/CarolinaSalas.jpg',
    role: 'Investigadora principal',
    name: 'Dra. Carolina Salas Matamoros',
    institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    email: 'carolina.salas_mata@ucr.ac.cr',
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
    findMany.mockResolvedValue([researcherRow({ email: null })])

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

    expect(researcher?.email).toBe('carolina.salas_mata@ucr.ac.cr')
  })

  test('orders by createdAt, so editing a profile never reorders it', async () => {
    findMany.mockResolvedValue([])

    await getResearchers()

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
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

  test('rejects a missing photo', () => {
    const result = researcherInputSchema.safeParse({ ...validInput, src: '' })

    expect(result.success).toBe(false)
  })

  test('rejects an empty required field', () => {
    const result = researcherInputSchema.safeParse({ ...validInput, name: '  ' })

    expect(result.success).toBe(false)
  })

  test('has no email field — the admin form has none yet', () => {
    expect('email' in researcherInputSchema.shape).toBe(false)
  })
})

describe('updateResearcher', () => {
  const updateInput = {
    src: '/images/ROSAC/team/Updated.jpg',
    role: 'Investigador asociado',
    name: 'Nuevo nombre',
    institution: 'UCR',
    description: 'Texto actualizado.',
  }

  test('returns null without writing when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await updateResearcher('missing-id', updateInput, 'admin-1')

    expect(result).toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  test('persists the change and stamps modifiedBy, leaving email untouched', async () => {
    findUnique.mockResolvedValue(researcherRow())
    update.mockResolvedValue(
      researcherRow({
        photoUrl: updateInput.src,
        role: updateInput.role,
        name: updateInput.name,
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
        institution: updateInput.institution,
        description: updateInput.description,
        modifiedBy: 'admin-1',
      },
    })
    expect(result?.name).toBe('Nuevo nombre')
    // The email column was never part of `data`, so the existing address survives untouched.
    expect(result?.email).toBe('carolina.salas_mata@ucr.ac.cr')
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
        email: null,
      }),
    )

    const result = await createResearcher(createInput, 'admin-1')

    expect(create).toHaveBeenCalledWith({
      data: {
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        institution: createInput.institution,
        description: createInput.description,
        modifiedBy: 'admin-1',
      },
    })
    expect(result.email).toBeUndefined()
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
