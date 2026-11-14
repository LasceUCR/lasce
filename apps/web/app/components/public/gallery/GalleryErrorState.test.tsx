import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { GalleryErrorState, type GalleryErrorStateProps } from './GalleryErrorState'
import meta from './GalleryErrorState.stories'

const args = meta.args as GalleryErrorStateProps

describe('GalleryErrorState', () => {
  test('explains the failure as an alert and offers to retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<GalleryErrorState {...args} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent(args.message)

    await user.click(screen.getByRole('button', { name: args.retryLabel }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('renders the message and retry label from props, not a fixed language', async () => {
    const onRetry = vi.fn()
    render(
      <GalleryErrorState
        message="Could not load the gallery. Please try again."
        onRetry={onRetry}
        retryLabel="Retry"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the gallery. Please try again.',
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
