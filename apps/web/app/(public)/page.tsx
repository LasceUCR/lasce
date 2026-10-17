import type { LucideIcon } from 'lucide-react'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { Button } from '@/app/components/public/Button'
import { GoesSolarAnimation } from '@/app/components/public/GoesSolarAnimation'
import { HeroSolarObservation } from '@/app/components/public/HeroSolarObservation'
import { WorkAreasSection } from '@/app/components/public/WorkAreasSection'
import type { WorkAreaItem } from '@/app/components/public/WorkAreasSection'
import { EditableHomeHero } from '@/app/components/public/home/EditableHomeHero'
import {
  GeomagneticIndicators,
  type IndicatorItem,
} from '@/app/components/public/home/GeomagneticIndicators'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { getHomeContent, indicatorCodes, indicatorTones, type HomeHeroData } from '@/app/lib/home'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getHomeAreaCards, workAreasSectionId, type AreaCardDefinition } from '@/app/lib/work-areas'

// The laboratory's official name. It is a proper noun, so it is not a message: it reads the same
// in every language (docs/internationalization.md, "Add a string").
const institutionName = 'Laboratorio de Astrofísica Solar y Clima Espacial'

export const dynamic = 'force-dynamic'

function toWorkAreaItems(areas: AreaCardDefinition[]): WorkAreaItem[] {
  return areas.map((area) => {
    const AreaIcon: LucideIcon = area.icon

    return {
      title: area.title,
      description: area.description,
      href: area.href,
      icon: <AreaIcon size={25} strokeWidth={1.7} />,
    }
  })
}

export default async function HomePage() {
  const [locale, t, messages, canEdit] = await Promise.all([
    getLocale(),
    getTranslations('home'),
    getMessages(),
    userHasPermission('edit_components'),
  ])

  // The banner and the indices are stored in the database (docs/home-page.md), in the language
  // chosen in the header. Every language and the version to save against reach the browser only
  // for an editor. Without stored rows the catalogue's text is shown, read-only.
  const content = await getHomeContent(resolveLocale(locale), { includeEditingData: canEdit })

  const hero: HomeHeroData = content.hero ?? {
    title: t('hero.title'),
    lead: t('hero.lead'),
  }

  const indicators: IndicatorItem[] =
    content.indicators.length > 0
      ? content.indicators.map(({ code, ...indicator }) => ({
          ...indicator,
          label: t(`indicators.${code}.label`),
          tone: indicatorTones[code],
        }))
      : indicatorCodes.map((code) => ({
          id: code,
          label: t(`indicators.${code}.label`),
          tone: indicatorTones[code],
          value: t(`indicators.${code}.value`),
          description: t(`indicators.${code}.description`),
        }))

  return (
    <>
      <section className="hero" id="inicio">
        <div className="hero-visual" aria-hidden="true">
          <GoesSolarAnimation />
        </div>
        <div className="hero-content page-width">
          <p className="hero-institution" lang="es">
            {institutionName}
          </p>
          <EditableHomeHero canEdit={canEdit} hero={hero} />
          <div className="hero-actions">
            <Button href="/nosotros">{t('hero.cta')}</Button>
          </div>
        </div>
        <HeroSolarObservation />
      </section>

      <div className="home-content">
        <GeomagneticIndicators
          canEdit={canEdit}
          demoNotice={t('indicators.demoNotice')}
          indicators={indicators}
          title={t('indicators.title')}
        />

        <WorkAreasSection
          id={workAreasSectionId}
          title={t('areas.title')}
          subtitle={t('areas.subtitle')}
          areas={toWorkAreaItems(getHomeAreaCards(messages.workAreas))}
        />
      </div>
    </>
  )
}
