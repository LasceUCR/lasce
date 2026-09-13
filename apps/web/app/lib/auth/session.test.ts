import { beforeEach, describe, expect, test, vi } from 'vitest'

const create = vi.fn()
const findUnique = vi.fn()
const deleteMany = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: { session: { create, findUnique, deleteMany } },
}))

const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }

vi.mock('next/headers', () => ({
  cookies: async () => store,
}))

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})

vi.mock('next/navigation', () => ({ redirect }))

const { createSession, deleteCurrentSession, getSessionUser, requireUser } =
  await import('./session')
const { ACCOUNT_COOKIE } = await import('./account')
const { SESSION_COOKIE, generateSessionToken, hashSessionToken } = await import('./session-token')

const user = {
  id: 'user-1',
  fullName: 'Ana Pérez Rojas',
  email: 'ana.perez@ucr.ac.cr',
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
  role: 'VISITOR',
  createdAt: new Date('2026-09-13T06:00:00.000Z'),
}

function cookieValue(value: string | undefined) {
  store.get.mockImplementation((name: string) =>
    name === SESSION_COOKIE && value !== undefined ? { name, value } : undefined,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  cookieValue(undefined)
})

describe('createSession', () => {
  test('stores only the hash of the token it hands to the browser', async () => {
    create.mockResolvedValue({})

    await createSession({ id: 'user-1', fullName: 'Ana Pérez Rojas' })

    const [sessionCookie, accountCookie] = store.set.mock.calls as [
      [string, string, { expires: Date; httpOnly: boolean }],
      [string, string, { expires: Date; httpOnly: boolean }],
    ]
    expect(sessionCookie[0]).toBe(SESSION_COOKIE)
    expect(sessionCookie[2].httpOnly).toBe(true)
    expect(accountCookie).toEqual([
      ACCOUNT_COOKIE,
      'Ana Pérez Rojas',
      expect.objectContaining({ httpOnly: false, expires: sessionCookie[2].expires }),
    ])

    const token = sessionCookie[1]
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: hashSessionToken(token),
        expiresAt: sessionCookie[2].expires,
      },
    })
    expect(JSON.stringify(create.mock.calls)).not.toContain(token)

    const lifetime = sessionCookie[2].expires.getTime() - Date.now()
    expect(lifetime).toBeGreaterThan(29 * 24 * 60 * 60 * 1000)
    expect(lifetime).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000)
  })
})

describe('getSessionUser', () => {
  test('is null without a cookie and queries nothing', async () => {
    await expect(getSessionUser()).resolves.toBeNull()

    expect(findUnique).not.toHaveBeenCalled()
  })

  test('is null for a malformed token and queries nothing', async () => {
    cookieValue('not-a-token')

    await expect(getSessionUser()).resolves.toBeNull()

    expect(findUnique).not.toHaveBeenCalled()
  })

  test('is null when no row matches the token', async () => {
    cookieValue(generateSessionToken())
    findUnique.mockResolvedValue(null)

    await expect(getSessionUser()).resolves.toBeNull()
  })

  test('is null once the row has expired', async () => {
    cookieValue(generateSessionToken())
    findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), user })

    await expect(getSessionUser()).resolves.toBeNull()
  })

  test('returns the user behind a live session, looking it up by hash only', async () => {
    const token = generateSessionToken()
    cookieValue(token)
    findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), user })

    await expect(getSessionUser()).resolves.toEqual(user)

    expect(findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionToken(token) },
      select: expect.objectContaining({ expiresAt: true }),
    })
    expect(JSON.stringify(findUnique.mock.calls)).not.toContain(token)
  })

  test('never writes cookies, since it runs during render', async () => {
    cookieValue(generateSessionToken())
    findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), user })

    await getSessionUser()

    expect(store.set).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })
})

describe('deleteCurrentSession', () => {
  test('deletes the row behind the token and both cookies', async () => {
    const token = generateSessionToken()
    cookieValue(token)
    deleteMany.mockResolvedValue({ count: 1 })

    await deleteCurrentSession()

    expect(deleteMany).toHaveBeenCalledWith({ where: { tokenHash: hashSessionToken(token) } })
    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE)
    expect(store.delete).toHaveBeenCalledWith(ACCOUNT_COOKIE)
  })

  test('still clears both cookies when there is no usable token', async () => {
    cookieValue('garbage')

    await deleteCurrentSession()

    expect(deleteMany).not.toHaveBeenCalled()
    expect(store.delete).toHaveBeenCalledTimes(2)
  })
})

describe('requireUser', () => {
  test('returns the signed-in user', async () => {
    cookieValue(generateSessionToken())
    findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), user })

    await expect(requireUser('/cuenta')).resolves.toEqual(user)

    expect(redirect).not.toHaveBeenCalled()
  })

  test('sends an anonymous visitor to the login page with the return path', async () => {
    await expect(requireUser('/cuenta')).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=%2Fcuenta&reason=auth',
    )

    expect(redirect).toHaveBeenCalledTimes(1)
  })
})
