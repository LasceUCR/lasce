import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import AcademicActivitiesError from './error'

describe('AcademicActivitiesError', () => {
  test('shows a localized error and retries the server render', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    mocks.refresh.mockClear()

    renderWithIntl(<AcademicActivitiesError error={new Error('database down')} reset={reset} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las actividades académicas. Inténtelo de nuevo.',
    )
    expect(screen.queryByText('database down')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  test('uses the retry message in English', () => {
    renderWithIntl(
      <AcademicActivitiesError error={new Error('database down')} reset={() => {}} />,
      { locale: 'en' },
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The academic activities could not be loaded. Try again.',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
