import { createElement, type ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

// `rosac.ts` imports `prisma` at module scope — this stubs it out so loading
// it for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

const dynamicState = vi.hoisted(() => ({ fail: true }))

import { rosacInfoContent } from '@/app/lib/rosac'
import { RosacLocationMapLoader } from './RosacLocationMapLoader'

vi.mock('next/dynamic', () => ({
  default: (_importer: unknown, options: { loading?: ComponentType }) =>
    function DynamicStandIn() {
      if (dynamicState.fail) throw new Error('Loading map chunk failed')
      return options.loading ? createElement(options.loading) : null
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

  test('shows a map-shaped placeholder that announces the load until the script arrives', () => {
    dynamicState.fail = false
    try {
      renderWithIntl(<RosacLocationMapLoader location={rosacInfoContent.location} />)

      expect(screen.getByRole('status')).toHaveTextContent('Cargando el mapa…')
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    } finally {
      dynamicState.fail = true
    }
  })

  test('announces the map load in English on the English site', () => {
    dynamicState.fail = false
    try {
      renderWithIntl(<RosacLocationMapLoader location={rosacInfoContent.location} />, {
        locale: 'en',
      })

      expect(screen.getByRole('status')).toHaveTextContent('Loading the map…')
    } finally {
      dynamicState.fail = true
    }
  })
})
