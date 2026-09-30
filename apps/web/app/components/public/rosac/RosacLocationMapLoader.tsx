'use client'

import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/app/components/public/ErrorBoundary'
import { LocationUnavailable } from './LocationUnavailable'

import type { RosacLocationContent } from '@/app/lib/rosac'

import styles from './RosacInfoPage.module.css'

// Leaflet reads `window` as soon as it is imported, which crashes a Server Component's
// render pass. `next/dynamic(..., { ssr: false })` is disallowed inside a Server
// Component (RosacInfoPage.tsx is one), so it lives here, in a small Client Component
// whose only job is to defer loading the real map to the browser.
const RosacLocationMap = dynamic(
  () => import('./RosacLocationMap').then((mod) => mod.RosacLocationMap),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden="true" className={`${styles.locationMapSkeleton} surface-card`} />
    ),
  },
)

export interface RosacLocationMapLoaderProps {
  location: RosacLocationContent
}

export function RosacLocationMapLoader({ location }: RosacLocationMapLoaderProps) {
  return (
    <ErrorBoundary fallback={<LocationUnavailable message={location.unavailableMessage} />}>
      <RosacLocationMap location={location} />
    </ErrorBoundary>
  )
}
