import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { SpaceWeatherPage } from '@/app/components/public/space-weather/SpaceWeatherPage'
import { getSpaceWeatherContent } from '@/app/lib/space-weather'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('spaceWeather.meta')

  return { title: t('title'), description: t('description') }
}

export default async function ClimaEspacialRoute() {
  return <SpaceWeatherPage content={getSpaceWeatherContent(await getMessages())} />
}
