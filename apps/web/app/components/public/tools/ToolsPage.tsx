import Image from 'next/image'
import { ExternalLink, Info } from 'lucide-react'

const SWAPRO_URL = 'https://swaat.up.railway.app'

export function ToolsPage() {
  return (
    <div className="page-width tools-page-alt">
      <div className="section-heading">
        <h1>Herramientas científicas</h1>
        <p>Acceso a servicios especializados integrados o enlazados desde LASCE.</p>
      </div>

      <div className="tool-feature-card">
        <div className="tool-feature-body">
          <div className="tool-feature-row">
            <h2 className="tool-feature-title">SWAAT</h2>

            <div className="tool-feature-media">
              <Image
                src="/images/tools/SWAAT-sun.png"
                alt="Llamarada solar con ecuaciones de flujo de rayos X, densidad de plasma y velocidad de CME"
                fill
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>

            <div className="tool-feature-text-col">
              <div className="tool-feature-text">
                <p>
                  Análisis automatizado de eventos solares orientado a señales de rayos X suaves
                  GOES/XRS-B (Soft X-Ray), permitiendo visualizar la evolución temporal de la curva
                  XRS. Además, se compara dicha evolución temporal de la curva de XRS con la de
                  microondas RSTN a 8800 MHz.
                </p>
                <p>
                  La herramienta genera una gráfica estática y una versión interactiva. En eventos
                  de interés, permite realizar inspección visual y estimar posteriormente la
                  velocidad de propagación del CME, Vp. En una próxima versión se incorporará la
                  predicción del tiempo de tránsito, TT.
                </p>
              </div>

              <a
                className="button button-primary tool-feature-cta"
                href={SWAPRO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />
                Acceder a SWAPRO
              </a>
            </div>
          </div>
        </div>
      </div>

      <p className="tool-footnote">
        <Info aria-hidden="true" size={14} strokeWidth={1.8} />
        Al acceder, serás redirigido al sitio externo de SWAPRO.
      </p>
    </div>
  )
}
