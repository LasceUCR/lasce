import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { SolarAstrophysicsPage } from '@/app/components/public/solar-astrophysics/SolarAstrophysicsPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getSolarAstrophysicsContent } from '@/app/lib/solar-astrophysics'
import { getSolarPhysicsSection } from '@/app/lib/solar-physics-section'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('solarPhysics.meta')

  return { title: t('title'), description: t('description') }
}

export const dynamic = 'force-dynamic'

export default async function FisicaSolarRoute() {
  const [locale, messages, canEdit] = await Promise.all([
    getLocale(),
    getMessages(),
    userHasPermission('edit_components'),
  ])

  // The LASCE section in the language chosen in the header (the `lasce_locale` cookie). Both
  // languages and the version to save against go to the browser only for an editor.
  const lasceSection = await getSolarPhysicsSection(resolveLocale(locale), {
    includeEditingData: canEdit,
  })

  return (
    <SolarAstrophysicsPage
      canEditLasce={canEdit}
      content={getSolarAstrophysicsContent(messages)}
      lasceSection={lasceSection}
    />
  )
}
