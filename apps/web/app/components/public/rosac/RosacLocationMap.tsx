'use client'

import L from 'leaflet'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapPinOff } from 'lucide-react'
import { useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'

import { ErrorBoundary } from '@/app/components/public/ErrorBoundary'
import type { RosacLocationContent } from '@/app/lib/rosac'

import styles from './RosacInfoPage.module.css'

// Leaflet's default marker icon is looked up by a relative URL that assumes the
// `leaflet` package's own folder layout on disk, which breaks once bundled. Importing
// the three images directly makes Next.js emit them as static assets instead and gives
// Leaflet real URLs to them, so no CDN dependency is needed just to show a pin.
const markerIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/**
 * Reports "unavailable" only for a failure before any tile has ever loaded. A single
 * stray tile error on an otherwise working map (a flaky request among dozens) should
 * not tear down a map the visitor can already see and use.
 */
function TileWatcher({ onUnavailable }: { onUnavailable: () => void }) {
  const hasLoadedATile = useRef(false)

  useMapEvents({
    tileload: () => {
      hasLoadedATile.current = true
    },
    tileerror: () => {
      if (!hasLoadedATile.current) {
        onUnavailable()
      }
    },
  })

  return null
}

function LocationUnavailable({ message }: { message: string }) {
  return (
    <div className={`${styles.locationMapUnavailable} surface-card`} role="status">
      <MapPinOff aria-hidden="true" size={22} strokeWidth={1.8} />
      <p>{message}</p>
    </div>
  )
}

export interface RosacLocationMapProps {
  location: RosacLocationContent
  /** Testing seam: called with the underlying Leaflet map once it mounts. */
  onMapReady?: (map: L.Map | null) => void
}

export function RosacLocationMap({ location, onMapReady }: RosacLocationMapProps) {
  const [isUnavailable, setIsUnavailable] = useState(false)
  const position: [number, number] = [location.coordinates.latitude, location.coordinates.longitude]

  if (isUnavailable) {
    return <LocationUnavailable message={location.unavailableMessage} />
  }

  return (
    <ErrorBoundary fallback={<LocationUnavailable message={location.unavailableMessage} />}>
      <div
        aria-label={`Mapa de ubicación de ${location.markerLabel}`}
        className={`${styles.locationMapWrapper} surface-card`}
        role="region"
      >
        <MapContainer
          center={position}
          className={styles.locationMap}
          ref={onMapReady}
          // A page-scroll gesture over the map should keep scrolling the page, not zoom
          // the map; visitors can still zoom with the on-screen +/- controls, touch
          // pinch, or keyboard, once the map has focus.
          scrollWheelZoom={false}
          zoom={location.zoom}
        >
          <TileWatcher onUnavailable={() => setIsUnavailable(true)} />
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <Marker icon={markerIcon} position={position}>
            <Tooltip direction="top" offset={[0, -38]} permanent>
              {location.markerLabel}
            </Tooltip>
          </Marker>
        </MapContainer>
      </div>
    </ErrorBoundary>
  )
}
