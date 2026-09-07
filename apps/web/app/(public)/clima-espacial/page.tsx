import type { Metadata } from 'next'

import { SpaceWeatherPage } from '@/app/components/public/space-weather/SpaceWeatherPage'
import { spaceWeatherMeta } from '@/app/lib/space-weather'

export const metadata: Metadata = {
  title: spaceWeatherMeta.title,
  description: spaceWeatherMeta.description,
}

export default function ClimaEspacialRoute() {
  return <SpaceWeatherPage />
}
