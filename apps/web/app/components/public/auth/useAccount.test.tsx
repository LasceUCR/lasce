import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ACCOUNT_COOKIE, notifyAccountChanged, readAccountName } from '@/app/lib/auth/account'
import type { SessionCapabilitiesResponse } from '@/app/lib/auth/capabilities'

import { SESSION_ENDPOINT, useAccount } from './useAccount'

const EDIT_MODE_KEY = 'lasce:cms-edit-mode'

/** Writes the browser-editable cookie by hand, the way a tampering visitor would. */
function setRawAccountCookie(payload: Record<string, unknown>) {
  document.cookie = `${ACCOUNT_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/`
}

const signedIn = (
  overrides: Partial<Extract<SessionCapabilitiesResponse, { signedIn: true }>> = {},
): SessionCapabilitiesResponse => ({
  signedIn: true,
  name: 'Ana Pérez Rojas',
  role: 'VISITOR',
  canAccessAdmin: false,
  canEdit: false,
  ...overrides,
})

const fetchMock = vi.fn()

function answer(body: SessionCapabilitiesResponse, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

const noop = () => vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = `${ACCOUNT_COOKIE}=; Max-Age=0; Path=/`
})

describe('useAccount', () => {
  test('is signed out without the cookie and asks the server nothing', () => {
    const { result } = renderHook(() => useAccount(noop()))

    expect(result.current.account).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.canAccessAdmin).toBe(false)
    expect(result.current.canEdit).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('greets from the cookie at once, but offers nothing privileged until the server confirms', async () => {
    let resolve: (response: Response) => void = () => undefined
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => (resolve = done)))
    setRawAccountCookie({ name: 'Ana Pérez Rojas' })

    const { result } = renderHook(() => useAccount(noop()))

    expect(result.current.account).toBe('Ana Pérez Rojas')
    expect(result.current.canAccessAdmin).toBe(false)
    expect(result.current.canEdit).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_ENDPOINT,
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
    )

    await act(async () => {
      resolve(
        new Response(
          JSON.stringify(signedIn({ role: 'ADMIN', canAccessAdmin: true, canEdit: true })),
        ),
      )
    })

    await waitFor(() => expect(result.current.canAccessAdmin).toBe(true))
    expect(result.current.canEdit).toBe(true)
    expect(result.current.role).toBe('ADMIN')
  })

  test('ignores a forged administrator role in the cookie', async () => {
    setRawAccountCookie({ name: 'Ana Pérez Rojas', role: 'ADMIN' })
    answer(signedIn({ role: 'VISITOR' }))

    const { result } = renderHook(() => useAccount(noop()))

    await waitFor(() => expect(result.current.role).toBe('VISITOR'))
    expect(result.current.canAccessAdmin).toBe(false)
    expect(result.current.canEdit).toBe(false)
  })

  test('ignores a forged assistant role in the cookie and turns a stored edit mode off', async () => {
    window.localStorage.setItem(EDIT_MODE_KEY, 'true')
    setRawAccountCookie({ name: 'Ana Pérez Rojas', role: 'ASSISTANT' })
    answer(signedIn({ role: 'VISITOR' }))

    const { result } = renderHook(() => useAccount(noop()))

    await waitFor(() => expect(result.current.role).toBe('VISITOR'))
    expect(result.current.canEdit).toBe(false)
    expect(window.localStorage.getItem(EDIT_MODE_KEY)).toBe('false')
  })

  test('drops a stale cookie and the edit mode when the server says the session is gone', async () => {
    window.localStorage.setItem(EDIT_MODE_KEY, 'true')
    setRawAccountCookie({ name: 'Ana Pérez Rojas', role: 'ADMIN' })
    answer({ signedIn: false })

    const { result } = renderHook(() => useAccount(noop()))

    await waitFor(() => expect(result.current.account).toBeNull())
    expect(readAccountName(document.cookie)).toBeNull()
    expect(result.current.canAccessAdmin).toBe(false)
    expect(window.localStorage.getItem(EDIT_MODE_KEY)).toBe('false')
  })

  test('keeps the greeting but offers nothing privileged when the server fails', async () => {
    setRawAccountCookie({ name: 'Ana Pérez Rojas', role: 'ADMIN' })
    answer({ signedIn: false }, 500)

    const { result } = renderHook(() => useAccount(noop()))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(result.current.account).toBe('Ana Pérez Rojas')
    expect(result.current.canAccessAdmin).toBe(false)
    expect(result.current.canEdit).toBe(false)
    expect(readAccountName(document.cookie)).toBe('Ana Pérez Rojas')
  })

  test('picks up a server-side permission change on the next refresh, with no new cookie', async () => {
    setRawAccountCookie({ name: 'Ana Pérez Rojas' })
    answer(signedIn({ role: 'ASSISTANT', canAccessAdmin: true, canEdit: true }))

    const { result, rerender } = renderHook(({ path }) => useAccount(noop(), path), {
      initialProps: { path: '/' },
    })
    await waitFor(() => expect(result.current.canEdit).toBe(true))

    // The matrix lost the content grants; the header navigates.
    answer(signedIn({ role: 'ASSISTANT', canAccessAdmin: true, canEdit: false }))
    rerender({ path: '/noticias' })

    await waitFor(() => expect(result.current.canEdit).toBe(false))
    expect(result.current.canAccessAdmin).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('asks again for a new login announced by the account store', async () => {
    answer(signedIn({ name: 'Carlos Solís', role: 'ADMIN', canAccessAdmin: true, canEdit: true }))
    const { result } = renderHook(() => useAccount(noop()))

    setRawAccountCookie({ name: 'Carlos Solís' })
    act(() => notifyAccountChanged())

    expect(result.current.account).toBe('Carlos Solís')
    await waitFor(() => expect(result.current.canAccessAdmin).toBe(true))
  })

  test('signs out optimistically, clears the cookie and the edit mode, and runs the action once', async () => {
    window.localStorage.setItem(EDIT_MODE_KEY, 'true')
    setRawAccountCookie({ name: 'Ana Pérez Rojas' })
    answer(signedIn({ role: 'ADMIN', canAccessAdmin: true, canEdit: true }))
    const logoutAction = noop()
    const { result } = renderHook(() => useAccount(logoutAction))
    await waitFor(() => expect(result.current.canAccessAdmin).toBe(true))

    act(() => result.current.signOut())

    await waitFor(() => expect(result.current.account).toBeNull())
    expect(result.current.canAccessAdmin).toBe(false)
    expect(result.current.canEdit).toBe(false)
    expect(readAccountName(document.cookie)).toBeNull()
    expect(window.localStorage.getItem(EDIT_MODE_KEY)).toBe('false')
    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.isSigningOut).toBe(false))
  })

  test('treats the redirect the action throws as success', async () => {
    const logoutAction = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/;307;' }),
      )
    setRawAccountCookie({ name: 'Ana Pérez Rojas' })
    answer(signedIn())
    const { result } = renderHook(() => useAccount(logoutAction))

    act(() => result.current.signOut())

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.isSigningOut).toBe(false))
    expect(result.current.account).toBeNull()
    expect(readAccountName(document.cookie)).toBeNull()
  })

  test('puts the name back when the action fails, so the menu tells the truth', async () => {
    const logoutAction = vi.fn().mockRejectedValue(new Error('database down'))
    setRawAccountCookie({ name: 'Ana Pérez Rojas' })
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(signedIn())))
    const { result } = renderHook(() => useAccount(logoutAction))

    act(() => result.current.signOut())

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.account).toBe('Ana Pérez Rojas'))
    expect(readAccountName(document.cookie)).toBe('Ana Pérez Rojas')
  })
})
