import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { SpaceWeatherPage } from '@/app/components/public/space-weather/SpaceWeatherPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getSpaceWeatherContent } from '@/app/lib/space-weather'
import { getSpaceWeatherSection } from '@/app/lib/space-weather-section'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('spaceWeather.meta')

  return { title: t('title'), description: t('description') }
}

// The Costa Rica card is read from the database, and the editor's controls depend on the session.
export const dynamic = 'force-dynamic'

export default async function ClimaEspacialRoute() {
  const [locale, messages, canEdit] = await Promise.all([
    getLocale(),
    getMessages(),
    userHasPermission('edit_components'),
  ])

  // In the language chosen in the header. Both languages and the version to save against go to
  // the browser only for an editor.
  const costaRicaSection = await getSpaceWeatherSection(resolveLocale(locale), {
    includeEditingData: canEdit,
  })

  return (
    <SpaceWeatherPage
      canEditCostaRica={canEdit}
      content={getSpaceWeatherContent(messages)}
      costaRicaSection={costaRicaSection}
    />
  )
}
