import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { SolarAstrophysicsPage } from '@/app/components/public/solar-astrophysics/SolarAstrophysicsPage'
import { getSolarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('solarPhysics.meta')

  return { title: t('title'), description: t('description') }
}

export default async function FisicaSolarRoute() {
  return <SolarAstrophysicsPage content={getSolarAstrophysicsContent(await getMessages())} />
}
