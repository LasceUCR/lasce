import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { WorkAreasSection } from '@/app/components/public/WorkAreasSection'
import type { WorkAreaItem } from '@/app/components/public/WorkAreasSection'
import { getHomeAreaCards, workAreasSectionId, type AreaCardDefinition } from '@/app/lib/work-areas'

const indicators = [
  { label: 'Índice Kp', value: '2 · Tranquilo', tone: 'teal' },
  { label: 'Índice Dst', value: '-12 nT · Estable', tone: 'cyan' },
  { label: 'Índice AE', value: '75 nT · Actividad baja', tone: 'blue' },
  { label: 'Índice Ap', value: '7 · Tranquilo', tone: 'teal' },
]

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

export default function HomePage() {
  return (
    <>
      <section className="hero" id="inicio">
        <div className="hero-visual" aria-hidden="true">
          <Image
            className="hero-image"
            src="/images/decorative/Solar-Flare.png"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 62vw"
          />
        </div>
        <div className="hero-content page-width">
          <h1>Exploramos el Sol para comprender el clima espacial</h1>
          <span className="hero-rule" aria-hidden="true" />
          <p>
            Investigamos la actividad solar y sus efectos en el medio interplanetario y la Tierra,
            mediante observaciones, instrumentación, análisis de datos y desarrollo científico.
          </p>
          <div className="hero-actions">
            <Button href="/nosotros">Conoce más sobre LASCE</Button>
          </div>
        </div>
      </section>

      <div className="home-content">
        <section className="indicators page-width" id="datos" aria-labelledby="indicators-title">
          <div className="indicator-heading">
            <h2 id="indicators-title">Índices geomagnéticos</h2>
            <span>Datos de demostración</span>
          </div>
          <div className="indicator-grid">
            {indicators.map((indicator) => (
              <article className={`indicator indicator-${indicator.tone}`} key={indicator.label}>
                <p>{indicator.label}</p>
                <strong>{indicator.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <WorkAreasSection
          id={workAreasSectionId}
          title="Áreas y accesos principales"
          subtitle="Investigar, observar, analizar y compartir."
          areas={toWorkAreaItems(getHomeAreaCards())}
        />
      </div>
    </>
  )
}
