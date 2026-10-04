import type { LucideIcon } from 'lucide-react'
import { getMessages, getTranslations } from 'next-intl/server'

import { Button } from '@/app/components/public/Button'
import { GoesSolarAnimation } from '@/app/components/public/GoesSolarAnimation'
import { HeroSolarObservation } from '@/app/components/public/HeroSolarObservation'
import { WorkAreasSection } from '@/app/components/public/WorkAreasSection'
import type { WorkAreaItem } from '@/app/components/public/WorkAreasSection'
import { getHomeAreaCards, workAreasSectionId, type AreaCardDefinition } from '@/app/lib/work-areas'

// Demonstration values until the geomagnetic indices are read from a real source. The label and
// the value of each one are in the `home.indicators` namespace.
const indicators = [
  { id: 'kp', tone: 'teal' },
  { id: 'dst', tone: 'cyan' },
  { id: 'ae', tone: 'blue' },
  { id: 'ap', tone: 'teal' },
] as const

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
  const t = await getTranslations('home')
  const messages = await getMessages()

  return (
    <>
      <section className="hero" id="inicio">
        <div className="hero-visual" aria-hidden="true">
          <GoesSolarAnimation />
        </div>
        <div className="hero-content page-width">
          <h1>{t('hero.title')}</h1>
          <span className="hero-rule" aria-hidden="true" />
          <p>{t('hero.lead')}</p>
          <div className="hero-actions">
            <Button href="/nosotros">{t('hero.cta')}</Button>
          </div>
        </div>
        <HeroSolarObservation />
      </section>

      <div className="home-content">
        <section className="indicators page-width" id="datos" aria-labelledby="indicators-title">
          <div className="indicator-heading">
            <h2 id="indicators-title">{t('indicators.title')}</h2>
            <span>{t('indicators.demoNotice')}</span>
          </div>
          <div className="indicator-grid">
            {indicators.map((indicator) => (
              <article className={`indicator indicator-${indicator.tone}`} key={indicator.id}>
                <p>{t(`indicators.${indicator.id}.label`)}</p>
                <strong>{t(`indicators.${indicator.id}.value`)}</strong>
              </article>
            ))}
          </div>
        </section>

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
