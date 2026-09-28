import { render, screen } from '@testing-library/react'
import type L from 'leaflet'
import { act } from 'react'
import { describe, expect, test } from 'vitest'

import { Default } from './RosacLocationMap.stories'
import { RosacLocationMap, type RosacLocationMapProps } from './RosacLocationMap'

const defaultArgs = Default.args as RosacLocationMapProps

/** Renders the map and hands back the underlying Leaflet map instance. */
function renderMap() {
  let map: L.Map | null = null
  render(<RosacLocationMap {...defaultArgs} onMapReady={(instance) => (map = instance)} />)
  if (!map) {
    throw new Error('The map did not report itself ready.')
  }
  return map
}

describe('RosacLocationMap', () => {
  test('shows a labelled map region with the marker identified as ROSAC', () => {
    renderMap()

    expect(
      screen.getByRole('region', { name: `Mapa de ubicación de ${defaultArgs.location.markerLabel}` }),
    ).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.location.markerLabel)).toBeInTheDocument()
  })

  test('replaces the map with the unavailable message if it fails before any tile loads', () => {
    const map = renderMap()

    act(() => {
      map.fire('tileerror')
    })

    expect(screen.getByRole('status')).toHaveTextContent(defaultArgs.location.unavailableMessage)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  test('tolerates a stray tile error once the map has already loaded successfully', () => {
    const map = renderMap()

    act(() => {
      map.fire('tileload')
      map.fire('tileerror')
    })

    expect(
      screen.getByRole('region', { name: `Mapa de ubicación de ${defaultArgs.location.markerLabel}` }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
