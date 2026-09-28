import { render, screen } from '@testing-library/react'
import L from 'leaflet'
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { Default } from './RosacLocationMap.stories'
import { RosacLocationMap, type RosacLocationMapProps } from './RosacLocationMap'

const defaultArgs = Default.args as RosacLocationMapProps

/** Renders the map and hands back the underlying Leaflet map instance. */
function renderMap() {
  const result: { map: L.Map | null } = { map: null }
  render(<RosacLocationMap {...defaultArgs} onMapReady={(instance) => (result.map = instance)} />)
  if (!result.map) {
    throw new Error('The map did not report itself ready.')
  }
  return result.map
}

function tileLayer(map: L.Map) {
  const layers: L.TileLayer[] = []
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) layers.push(layer)
  })
  if (!layers[0]) throw new Error('The map has no tile layer.')
  return layers[0]
}

describe('RosacLocationMap', () => {
  test('reports an unavailable map when the initial requests never settle', () => {
    vi.useFakeTimers()
    try {
      renderMap()
      act(() => vi.advanceTimersByTime(defaultArgs.location.loadTimeoutMs))
      expect(screen.getByRole('status')).toHaveTextContent(defaultArgs.location.unavailableMessage)
    } finally {
      vi.useRealTimers()
    }
  })

  test('keeps a partially loaded map after the initial deadline', () => {
    vi.useFakeTimers()
    try {
      const map = renderMap()
      act(() => {
        tileLayer(map).fire('tileerror')
        tileLayer(map).fire('tileload')
        tileLayer(map).fire('load')
        vi.advanceTimersByTime(defaultArgs.location.loadTimeoutMs)
      })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ROSAC' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
  test('shows a labelled map region with the marker identified as ROSAC', () => {
    renderMap()

    expect(
      screen.getByRole('region', {
        name: `Mapa de ubicación de ${defaultArgs.location.markerLabel}`,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.location.markerLabel)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ROSAC' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acercar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alejar' })).toBeInTheDocument()
  })

  test('replaces the map with the unavailable message if it fails before any tile loads', () => {
    const map = renderMap()

    act(() => {
      tileLayer(map).fire('tileerror')
      tileLayer(map).fire('load')
    })

    expect(screen.getByRole('status')).toHaveTextContent(defaultArgs.location.unavailableMessage)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  test('tolerates a stray tile error once the map has already loaded successfully', () => {
    const map = renderMap()

    act(() => {
      tileLayer(map).fire('tileload')
      tileLayer(map).fire('tileerror')
      tileLayer(map).fire('load')
    })

    expect(
      screen.getByRole('region', {
        name: `Mapa de ubicación de ${defaultArgs.location.markerLabel}`,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
