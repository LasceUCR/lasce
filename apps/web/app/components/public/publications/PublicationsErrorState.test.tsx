import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { PublicationsErrorState, type PublicationsErrorStateProps } from './PublicationsErrorState'
import meta from './PublicationsErrorState.stories'

const args = meta.args as PublicationsErrorStateProps

describe('PublicationsErrorState', () => {
  test('explains the failure as an alert and offers to retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<PublicationsErrorState {...args} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las publicaciones. Inténtelo de nuevo.',
    )

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
