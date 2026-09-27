import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()
const findUnique = vi.fn()
const update = vi.fn()
const create = vi.fn()
const del = vi.fn()

const researcherFindMany = vi.fn()
const researcherFindUnique = vi.fn()
const researcherUpdate = vi.fn()
const researcherCreate = vi.fn()
const researcherDelete = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: {
    nosotrosActivity: { findMany, findUnique, update, create, delete: del },
    nosotrosResearcher: {
      findMany: researcherFindMany,
      findUnique: researcherFindUnique,
      update: researcherUpdate,
      create: researcherCreate,
      delete: researcherDelete,
    },
  },
}))

const {
  createNosotrosActivity,
  createNosotrosResearcher,
  deleteNosotrosActivity,
  deleteNosotrosResearcher,
  getNosotrosActivities,
  getNosotrosResearchers,
  nosotrosActivityInputSchema,
  nosotrosResearcherInputSchema,
  updateNosotrosActivity,
  updateNosotrosResearcher,
} = await import('./nosotros')

function researcherRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'researcher-1',
    photoUrl: '/images/Researchers/AllanBerrocal.jpg',
    role: 'Investigador colaborador',
    name: 'Dr. Allan Francisco Berrocal Rojas',
    institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
    email: ['allan.berrocal@ucr.ac.cr'],
    description: 'Diseño, desarrollo e implementación de la plataforma informática del LASCE.',
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function activityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'activity-1',
    icon: 'SUN',
    title: 'Fenómenos solares eruptivos',
    paragraph: "Analizamos fenómenos solares eruptivos, como 'flares'.",
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNosotrosActivities', () => {
  test('maps each row to the public shape, lowercasing the icon', async () => {
    findMany.mockResolvedValue([activityRow()])

    const activities = await getNosotrosActivities()

    expect(activities).toEqual([
      {
        id: 'activity-1',
        icon: 'sun',
        title: 'Fenómenos solares eruptivos',
        description: "Analizamos fenómenos solares eruptivos, como 'flares'.",
        modifiedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  test('orders by createdAt, so editing a card never reorders it', async () => {
    findMany.mockResolvedValue([])

    await getNosotrosActivities()

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
  })
})

describe('nosotrosActivityInputSchema', () => {
  test('accepts a well-formed input', () => {
    const result = nosotrosActivityInputSchema.safeParse({
      icon: 'waves',
      title: 'Nuevo título',
      description: 'Nuevo texto',
    })

    expect(result.success).toBe(true)
  })

  test('rejects an unknown icon', () => {
    const result = nosotrosActivityInputSchema.safeParse({
      icon: 'moon',
      title: 'Nuevo título',
      description: 'Nuevo texto',
    })

    expect(result.success).toBe(false)
  })

  test('rejects an empty title or description', () => {
    const result = nosotrosActivityInputSchema.safeParse({
      icon: 'sun',
      title: '  ',
      description: '  ',
    })

    expect(result.success).toBe(false)
  })
})

describe('updateNosotrosActivity', () => {
  const updateInput = { icon: 'waves' as const, title: 'Nuevo título', description: 'Nuevo texto' }

  test('returns null without writing when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await updateNosotrosActivity('missing-id', updateInput, 'admin-1')

    expect(result).toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  test('persists the change and stamps modifiedBy with the given user', async () => {
    findUnique.mockResolvedValue(activityRow())
    update.mockResolvedValue(
      activityRow({ icon: 'WAVES', title: 'Nuevo título', paragraph: 'Nuevo texto' }),
    )

    const result = await updateNosotrosActivity('activity-1', updateInput, 'admin-1')

    expect(update).toHaveBeenCalledWith({
      where: { id: 'activity-1' },
      data: {
        icon: 'WAVES',
        title: 'Nuevo título',
        paragraph: 'Nuevo texto',
        modifiedBy: 'admin-1',
      },
    })
    expect(result).toEqual({
      id: 'activity-1',
      icon: 'waves',
      title: 'Nuevo título',
      description: 'Nuevo texto',
      modifiedAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('createNosotrosActivity', () => {
  test('creates the activity, authored by the given user', async () => {
    const createInput = { icon: 'code' as const, title: 'Actividad nueva', description: 'Texto' }
    create.mockResolvedValue(
      activityRow({ icon: 'CODE', title: 'Actividad nueva', paragraph: 'Texto' }),
    )

    const result = await createNosotrosActivity(createInput, 'admin-1')

    expect(create).toHaveBeenCalledWith({
      data: {
        icon: 'CODE',
        title: 'Actividad nueva',
        paragraph: 'Texto',
        modifiedBy: 'admin-1',
      },
    })
    expect(result).toEqual({
      id: 'activity-1',
      icon: 'code',
      title: 'Actividad nueva',
      description: 'Texto',
      modifiedAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('deleteNosotrosActivity', () => {
  test('returns false without deleting when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await deleteNosotrosActivity('missing-id')

    expect(result).toBe(false)
    expect(del).not.toHaveBeenCalled()
  })

  test('deletes the row and returns true when it exists', async () => {
    findUnique.mockResolvedValue(activityRow())

    const result = await deleteNosotrosActivity('activity-1')

    expect(del).toHaveBeenCalledWith({ where: { id: 'activity-1' } })
    expect(result).toBe(true)
  })
})

describe('getNosotrosResearchers', () => {
  test('maps each row to a NosotrosResearcher, dropping a missing email and description to undefined', async () => {
    researcherFindMany.mockResolvedValue([researcherRow({ email: [], description: null })])

    const researchers = await getNosotrosResearchers()

    expect(researchers).toEqual([
      {
        id: 'researcher-1',
        src: '/images/Researchers/AllanBerrocal.jpg',
        role: 'Investigador colaborador',
        name: 'Dr. Allan Francisco Berrocal Rojas',
        institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
        email: undefined,
        description: undefined,
      },
    ])
  })

  test('keeps a real email and description when the row has them', async () => {
    researcherFindMany.mockResolvedValue([researcherRow()])

    const [researcher] = await getNosotrosResearchers()

    expect(researcher?.email).toEqual(['allan.berrocal@ucr.ac.cr'])
    expect(researcher?.description).toBe(
      'Diseño, desarrollo e implementación de la plataforma informática del LASCE.',
    )
  })

  test('orders by createdAt, so editing a profile never reorders it', async () => {
    researcherFindMany.mockResolvedValue([])

    await getNosotrosResearchers()

    expect(researcherFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
  })
})

describe('nosotrosResearcherInputSchema', () => {
  const validInput = {
    src: '/images/Researchers/Someone.jpg',
    role: 'Investigador colaborador',
    name: 'Alguien',
    institution: 'UCR',
    description: 'Texto de prueba.',
  }

  test('accepts a well-formed input', () => {
    expect(nosotrosResearcherInputSchema.safeParse(validInput).success).toBe(true)
  })

  test('accepts a missing description — unlike ROSAC, it is optional here', () => {
    const { description: _description, ...withoutDescription } = validInput

    expect(nosotrosResearcherInputSchema.safeParse(withoutDescription).success).toBe(true)
  })

  test('rejects a missing photo', () => {
    const result = nosotrosResearcherInputSchema.safeParse({ ...validInput, src: '' })

    expect(result.success).toBe(false)
  })

  test('rejects an empty required field', () => {
    const result = nosotrosResearcherInputSchema.safeParse({ ...validInput, name: '  ' })

    expect(result.success).toBe(false)
  })

  test('accepts an empty email — no public address', () => {
    expect(nosotrosResearcherInputSchema.safeParse({ ...validInput, email: '' }).success).toBe(true)
  })

  test('rejects a malformed email', () => {
    const result = nosotrosResearcherInputSchema.safeParse({
      ...validInput,
      email: 'not-an-email',
    })

    expect(result.success).toBe(false)
  })

  test('splits a comma-separated list into several addresses', () => {
    const result = nosotrosResearcherInputSchema.safeParse({
      ...validInput,
      email: 'uno@ucr.ac.cr, dos@ucr.ac.cr',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toEqual(['uno@ucr.ac.cr', 'dos@ucr.ac.cr'])
    }
  })
})

describe('updateNosotrosResearcher', () => {
  const updateInput = {
    src: '/images/Researchers/Updated.jpg',
    role: 'Investigador colaborador',
    name: 'Nuevo nombre',
    email: ['nuevo.nombre@ucr.ac.cr'],
    institution: 'UCR',
    description: 'Texto actualizado.',
  }

  test('returns null without writing when the id does not exist', async () => {
    researcherFindUnique.mockResolvedValue(null)

    const result = await updateNosotrosResearcher('missing-id', updateInput, 'admin-1')

    expect(result).toBeNull()
    expect(researcherUpdate).not.toHaveBeenCalled()
  })

  test('persists the change, including the email', async () => {
    researcherFindUnique.mockResolvedValue(researcherRow())
    researcherUpdate.mockResolvedValue(
      researcherRow({
        photoUrl: updateInput.src,
        role: updateInput.role,
        name: updateInput.name,
        email: updateInput.email,
        description: updateInput.description,
      }),
    )

    const result = await updateNosotrosResearcher('researcher-1', updateInput, 'admin-1')

    expect(researcherUpdate).toHaveBeenCalledWith({
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
    researcherFindUnique.mockResolvedValue(researcherRow())
    const emails = ['uno@ucr.ac.cr', 'dos@ucr.ac.cr']
    researcherUpdate.mockResolvedValue(researcherRow({ email: emails }))

    const result = await updateNosotrosResearcher(
      'researcher-1',
      { ...updateInput, email: emails },
      'admin-1',
    )

    expect(researcherUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: emails }) }),
    )
    expect(result?.email).toEqual(emails)
  })

  test('clears the description when the form submits none', async () => {
    researcherFindUnique.mockResolvedValue(researcherRow())
    researcherUpdate.mockResolvedValue(researcherRow({ description: null }))

    const { description: _description, ...updateWithoutDescription } = updateInput
    await updateNosotrosResearcher('researcher-1', updateWithoutDescription, 'admin-1')

    expect(researcherUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: null }) }),
    )
  })
})

describe('createNosotrosResearcher', () => {
  test('creates the profile, authored by the given user, with no email or description', async () => {
    const createInput = {
      src: '/images/Researchers/New.jpg',
      role: 'Investigador colaborador',
      name: 'Persona Nueva',
      institution: 'UCR',
    }
    researcherCreate.mockResolvedValue(
      researcherRow({
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        email: [],
        description: null,
      }),
    )

    const result = await createNosotrosResearcher(createInput, 'admin-1')

    expect(researcherCreate).toHaveBeenCalledWith({
      data: {
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        email: [],
        institution: createInput.institution,
        description: null,
        modifiedBy: 'admin-1',
      },
    })
    expect(result.email).toBeUndefined()
    expect(result.description).toBeUndefined()
  })
})

describe('deleteNosotrosResearcher', () => {
  test('returns false without deleting when the id does not exist', async () => {
    researcherFindUnique.mockResolvedValue(null)

    const result = await deleteNosotrosResearcher('missing-id')

    expect(result).toBe(false)
    expect(researcherDelete).not.toHaveBeenCalled()
  })

  test('deletes the row and returns true when it exists', async () => {
    researcherFindUnique.mockResolvedValue(researcherRow())

    const result = await deleteNosotrosResearcher('researcher-1')

    expect(researcherDelete).toHaveBeenCalledWith({ where: { id: 'researcher-1' } })
    expect(result).toBe(true)
  })
})
