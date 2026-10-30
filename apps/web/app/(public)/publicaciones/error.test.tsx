import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

const refresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

import PublicationsError from './error'

describe('PublicationsError', () => {
  test('asks the server for the page again and then clears the error', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    refresh.mockClear()

    renderWithIntl(<PublicationsError error={new Error('database down')} reset={reset} />)

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
