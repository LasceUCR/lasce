'use client'

import L from 'leaflet'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { useEffect, useId, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl } from 'react-leaflet'

import { ErrorBoundary } from '@/app/components/public/ErrorBoundary'
import type { RosacLocationContent } from '@/app/lib/rosac'

import styles from './RosacInfoPage.module.css'
import { LocationUnavailable } from './LocationUnavailable'

// Leaflet's default marker icon is looked up by a relative URL that assumes the
// `leaflet` package's own folder layout on disk, which breaks once bundled. Importing
// the three images directly makes Next.js emit them as static assets instead and gives
// Leaflet real URLs to them, so no CDN dependency is needed just to show a pin.
const markerIcon = L.icon({
  iconRetinaUrl: typeof iconRetinaUrl === 'string' ? iconRetinaUrl : iconRetinaUrl.src,
  iconUrl: typeof iconUrl === 'string' ? iconUrl : iconUrl.src,
  shadowUrl: typeof shadowUrl === 'string' ? shadowUrl : shadowUrl.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export interface RosacLocationMapProps {
  location: RosacLocationContent
  /** Testing seam: called with the underlying Leaflet map once it mounts. */
  onMapReady?: (map: L.Map | null) => void
}

export function RosacLocationMap({ location, onMapReady }: RosacLocationMapProps) {
  const [isUnavailable, setIsUnavailable] = useState(false)
  const hasLoadedATile = useRef(false)
  const instructionsId = useId()
  const position: [number, number] = [location.coordinates.latitude, location.coordinates.longitude]

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!hasLoadedATile.current) setIsUnavailable(true)
    }, location.loadTimeoutMs)
    return () => window.clearTimeout(timeout)
  }, [location.loadTimeoutMs])

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
        <p id={instructionsId} className="sr-only">
          Use las flechas para desplazar el mapa y las teclas más y menos para cambiar el zoom.
          Presione Tab para salir del mapa.
        </p>
        <MapContainer
          center={position}
          className={styles.locationMap}
          ref={(map) => {
            if (map) {
              map
                .getContainer()
                .setAttribute('aria-label', `Mapa interactivo de ${location.markerLabel}`)
              map.getContainer().setAttribute('aria-describedby', instructionsId)
            }
            onMapReady?.(map)
          }}
          // A page-scroll gesture over the map should keep scrolling the page, not zoom
          // the map; visitors can still zoom with the on-screen +/- controls, touch
          // pinch, or keyboard, once the map has focus.
          scrollWheelZoom={false}
          zoom={location.zoom}
          zoomControl={false}
        >
          <ZoomControl zoomInTitle="Acercar" zoomOutTitle="Alejar" />
          <TileLayer
            eventHandlers={{
              tileload: () => {
                hasLoadedATile.current = true
              },
              // GridLayer emits load once all visible requests have settled, including errors.
              load: () => {
                if (!hasLoadedATile.current) setIsUnavailable(true)
              },
            }}
            attribution={location.attribution}
            url={location.tileUrl}
          />
          <Marker
            alt={location.markerLabel}
            title={location.markerLabel}
            icon={markerIcon}
            position={position}
          >
            <Tooltip direction="top" offset={[0, -38]} permanent>
              {location.markerLabel}
            </Tooltip>
          </Marker>
        </MapContainer>
      </div>
    </ErrorBoundary>
  )
}
