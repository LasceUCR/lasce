import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { AcademicActivitiesErrorState } from './AcademicActivitiesErrorState'

describe('AcademicActivitiesErrorState', () => {
  test('shows the error as an alert and offers retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <AcademicActivitiesErrorState
        message="Could not load academic activities."
        onRetry={onRetry}
        retryLabel="Try again"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load academic activities.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
