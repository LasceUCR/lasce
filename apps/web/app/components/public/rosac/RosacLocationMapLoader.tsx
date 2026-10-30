'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

import { ErrorBoundary } from '@/app/components/public/ErrorBoundary'
import type { LocationMapLabels } from '@/app/lib/location-map'
import type { RosacLocationContent } from '@/app/lib/rosac'

import { LocationMapSkeleton } from './LocationMapSkeleton'
import { LocationUnavailable } from './LocationUnavailable'

function MapChunkLoading() {
  const t = useTranslations('common')
  return <LocationMapSkeleton label={t('loadingMap')} />
}

// Leaflet reads `window` as soon as it is imported, which crashes a Server Component's
// render pass. `next/dynamic(..., { ssr: false })` is disallowed inside a Server
// Component (RosacInfoPage.tsx is one), so it lives here, in a small Client Component
// whose only job is to defer loading the real map to the browser. Until that script
// arrives, the map's own box stays as a placeholder.
const RosacLocationMap = dynamic(
  () => import('./RosacLocationMap').then((mod) => mod.RosacLocationMap),
  { ssr: false, loading: () => <MapChunkLoading /> },
)

export interface RosacLocationMapLoaderProps {
  location: RosacLocationContent
  /** Accessible names. Omitted on ROSAC, which keeps the Spanish defaults. */
  labels?: LocationMapLabels
}

export function RosacLocationMapLoader({ location, labels }: RosacLocationMapLoaderProps) {
  return (
    <ErrorBoundary fallback={<LocationUnavailable message={location.unavailableMessage} />}>
      <RosacLocationMap labels={labels ?? location.labels} location={location} />
    </ErrorBoundary>
  )
}
