import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { GalleryErrorState } from './GalleryErrorState'

describe('GalleryErrorState', () => {
  test('explains the failure as an alert and offers to retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<GalleryErrorState onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la galería. Inténtelo de nuevo.',
    )

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
