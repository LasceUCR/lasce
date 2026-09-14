import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ACCOUNT_COOKIE, notifyAccountChanged, readAccountName } from '@/app/lib/auth/account'

import { useAccount } from './useAccount'

function setAccountCookie(name: string) {
  document.cookie = `${ACCOUNT_COOKIE}=${encodeURIComponent(name)}; Path=/`
}

afterEach(() => {
  document.cookie = `${ACCOUNT_COOKIE}=; Max-Age=0; Path=/`
})

describe('useAccount', () => {
  test('is signed out without the cookie and reads the name when it is set', () => {
    const { result, rerender } = renderHook(() => useAccount(vi.fn().mockResolvedValue(undefined)))

    expect(result.current.account).toBeNull()
    expect(result.current.isSigningOut).toBe(false)

    setAccountCookie('Ana Pérez Rojas')
    rerender()

    expect(result.current.account).toBe('Ana Pérez Rojas')
  })

  test('follows a change announced by the account store', () => {
    const { result } = renderHook(() => useAccount(vi.fn().mockResolvedValue(undefined)))

    setAccountCookie('Ana Pérez Rojas')
    act(() => notifyAccountChanged())

    expect(result.current.account).toBe('Ana Pérez Rojas')
  })

  test('signs out optimistically, clears the cookie and runs the action once', async () => {
    const logoutAction = vi.fn().mockResolvedValue(undefined)
    setAccountCookie('Ana Pérez Rojas')
    const { result } = renderHook(() => useAccount(logoutAction))
    expect(result.current.account).toBe('Ana Pérez Rojas')

    act(() => result.current.signOut())

    await waitFor(() => expect(result.current.account).toBeNull())
    expect(readAccountName(document.cookie)).toBeNull()
    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.isSigningOut).toBe(false))
  })

  test('treats the redirect the action throws as success', async () => {
    const logoutAction = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/;307;' }),
      )
    setAccountCookie('Ana Pérez Rojas')
    const { result } = renderHook(() => useAccount(logoutAction))

    act(() => result.current.signOut())

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.isSigningOut).toBe(false))
    expect(result.current.account).toBeNull()
    expect(readAccountName(document.cookie)).toBeNull()
  })

  test('puts the cookie back when the action fails, so the menu tells the truth', async () => {
    const logoutAction = vi.fn().mockRejectedValue(new Error('database down'))
    setAccountCookie('Ana Pérez Rojas')
    const { result } = renderHook(() => useAccount(logoutAction))

    act(() => result.current.signOut())

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.account).toBe('Ana Pérez Rojas'))
    expect(readAccountName(document.cookie)).toBe('Ana Pérez Rojas')
  })
})
