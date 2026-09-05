import type { Metadata } from 'next'

import { PublicationsExplorer } from '@/app/components/public/PublicationsExplorer'
import { publications } from '@/app/lib/publications'

export const metadata: Metadata = {
  title: 'Investigación | LASCE',
  description:
    'Publicaciones y colaboración científica del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
}

export default function InvestigacionPage() {
  return (
    <>
      <section className="public-route">
        <div className="public-route-content">
          <span className="public-route-kicker">Portal público LASCE</span>
          <h1>Investigación y publicaciones</h1>
          <p>Publicaciones y colaboración científica del LASCE.</p>
        </div>
      </section>

      <PublicationsExplorer publications={publications} />
    </>
  )
}
