import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { rosacInfoContent } from '@/app/lib/rosac'
import { RosacLocationMapLoader } from './RosacLocationMapLoader'

vi.mock('next/dynamic', () => ({
  default: () =>
    function FailedChunk() {
      throw new Error('Loading map chunk failed')
    },
}))

describe('RosacLocationMapLoader', () => {
  test('contains a failed dynamic component without removing surrounding content', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      render(
        <>
          <p>{rosacInfoContent.location.address}</p>
          <RosacLocationMapLoader location={rosacInfoContent.location} />
          <h2>Más información de ROSAC</h2>
        </>,
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        rosacInfoContent.location.unavailableMessage,
      )
      expect(screen.getByText(rosacInfoContent.location.address)).toBeVisible()
      expect(screen.getByRole('heading', { name: 'Más información de ROSAC' })).toBeVisible()
    } finally {
      error.mockRestore()
    }
  })
})
