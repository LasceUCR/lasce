import Image from 'next/image'
import { BookOpen, ChartNoAxesCombined, Orbit, RadioTower, Sun, Telescope } from 'lucide-react'

const indicators = [
  { label: 'Índice Kp', value: '2 · Tranquilo', tone: 'teal' },
  { label: 'Índice Dst', value: '-12 nT · Estable', tone: 'cyan' },
  { label: 'Índice AE', value: '75 nT · Actividad baja', tone: 'blue' },
  { label: 'Índice Ap', value: '7 · Tranquilo', tone: 'teal' },
]

const areas = [
  {
    icon: Sun,
    title: 'Física solar',
    description: 'Actividad y observaciones',
    href: '#investigacion',
  },
  {
    icon: Orbit,
    title: 'Clima espacial',
    description: 'Indicadores y monitoreo',
    href: '#datos',
  },
  { icon: RadioTower, title: 'Radioastronomía', description: 'Datos ROSAC', href: '#investigacion' },
  {
    icon: Telescope,
    title: 'Instrumentación',
    description: 'Instrumentos y citación',
    href: '#instrumentacion',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Datos y análisis',
    description: 'Consulta y descargas',
    href: '#datos',
  },
  {
    icon: BookOpen,
    title: 'Divulgación',
    description: 'Noticias y recursos',
    href: '#divulgacion',
  },
]

export default function HomePage() {
  return (
    <main>
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
            <a className="button button-primary" href="#nosotros">
              Conoce más sobre LASCE
            </a>
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

        <section className="areas page-width" id="investigacion" aria-labelledby="areas-title">
          <div className="section-heading">
            <h2 id="areas-title">Áreas y accesos principales</h2>
            <p>Investigar, observar, analizar y compartir.</p>
          </div>
          <div className="area-grid">
            {areas.map((area) => {
              const AreaIcon = area.icon

              return (
                <a className="area-card" href={area.href} key={area.title}>
                  <span className="area-icon" aria-hidden="true">
                    <AreaIcon size={25} strokeWidth={1.7} />
                  </span>
                  <span className="area-copy">
                    <strong>{area.title}</strong>
                    <small>{area.description}</small>
                    <span className="area-link">
                      Ver sección <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        </section>

        <span id="nosotros" className="anchor-target" />
        <span id="instrumentacion" className="anchor-target" />
        <span id="divulgacion" className="anchor-target" />
        <span id="noticias" className="anchor-target" />
      </div>
    </main>
  )
}
