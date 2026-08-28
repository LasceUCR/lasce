import Image from 'next/image'
import { BookOpen, ChartNoAxesCombined, Orbit, RadioTower, Sun, Telescope } from 'lucide-react'

const navigation = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Investigación', href: '#investigacion' },
  { label: 'Instrumentación', href: '#instrumentacion' },
  { label: 'Datos', href: '#datos' },
  { label: 'Divulgación', href: '#divulgacion' },
  { label: 'Noticias', href: '#noticias' },
  { label: 'Contacto', href: '#contacto' },
]

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

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <Image
        src={light ? '/brand/logo-UCR-claro.png' : '/brand/logo-UCR-negro.png'}
        alt="Universidad de Costa Rica"
        width={109}
        height={58}
        priority={!light}
      />
      {!light ? <span className="brand-divider" aria-hidden="true" /> : null}
      {!light ? (
        <Image
          className="lasce-logo"
          src="/brand/Logo_Lasce.jpg"
          alt="Laboratorio de Ciencias Espaciales"
          width={188}
          height={52}
          priority
        />
      ) : null}
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <a className="brand-link" href="#inicio" aria-label="Ir al inicio">
          <Brand />
        </a>

        <nav className="desktop-nav" aria-label="Navegación principal">
          {navigation.map((item, index) => (
            <a className={index === 0 ? 'active' : ''} href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="login-link" href="#inicio">
          Ingresar
        </a>

        <details className="mobile-menu">
          <summary aria-label="Abrir navegación">
            <span aria-hidden="true">☰</span>
          </summary>
          <nav aria-label="Navegación móvil">
            {navigation.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>
        </details>
      </header>

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

      <footer className="site-footer" id="contacto">
        <div className="footer-inner page-width">
          <div className="footer-identity">
            <Brand light />
            <div>
              <strong>Universidad de Costa Rica · LASCE</strong>
              <span>San Pedro de Montes de Oca</span>
            </div>
          </div>
          <nav className="footer-links" aria-label="Enlaces del pie de página">
            <a href="#contacto">Contacto</a>
            <a href="#inicio">Políticas</a>
            <a href="#inicio">Accesibilidad</a>
            <a href="https://www.instagram.com/lasce_ucr/" target="_blank" rel="noreferrer">
              Instagram
            </a>
          </nav>
        </div>
      </footer>
    </>
  )
}
