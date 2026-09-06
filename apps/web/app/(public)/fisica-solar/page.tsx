import type { Metadata } from 'next'

import { SolarAstrophysicsPage } from '@/app/components/public/solar-astrophysics/SolarAstrophysicsPage'
import { solarAstrophysicsMeta } from '@/app/lib/solar-astrophysics'

export const metadata: Metadata = {
  title: solarAstrophysicsMeta.title,
  description: solarAstrophysicsMeta.description,
}

export default function FisicaSolarRoute() {
  return <SolarAstrophysicsPage />
}
