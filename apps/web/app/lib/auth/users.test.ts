import { beforeEach, describe, expect, test, vi } from 'vitest'

const create = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: { user: { create } },
}))

const { createUser } = await import('./users')
const { default: DuplicateEmailError } = await import('./errors/DuplicateEmailError')

const newUser = {
  fullName: 'Ana Pérez Rojas',
  email: 'ana.perez@ucr.ac.cr',
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
  passwordHash: 'scrypt$32768$8$3$c2FsdHNhbHRzYWx0c2FsdA==$aGFzaA==',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createUser', () => {
  test('inserts exactly the given fields and returns the id and database-assigned role', async () => {
    create.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })

    await expect(createUser(newUser)).resolves.toEqual({ id: 'user-1', role: 'VISITOR' })

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({ data: newUser, select: { id: true, role: true } })
  })

  test('never sends a role, so the database default decides it', async () => {
    create.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })

    await createUser({ ...newUser, role: 'ADMIN' } as typeof newUser)

    const [args] = create.mock.calls[0] ?? []
    expect(Object.keys(args.data)).toEqual([
      'fullName',
      'email',
      'institution',
      'countryCode',
      'passwordHash',
    ])
  })

  test('maps a unique violation to DuplicateEmailError without echoing the email', async () => {
    create.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), {
        code: 'P2002',
        meta: { target: ['email'] },
      }),
    )

    const failure = await createUser(newUser).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(DuplicateEmailError)
    expect(failure).toMatchObject({ statusCode: 409, errorCode: 'DUPLICATE_EMAIL' })
    expect((failure as Error).message).not.toContain(newUser.email)
  })

  test('lets any other error propagate unchanged', async () => {
    const connectionError = Object.assign(new Error("Can't reach database server"), {
      code: 'P1001',
    })
    create.mockRejectedValue(connectionError)

    await expect(createUser(newUser)).rejects.toBe(connectionError)
  })
})
