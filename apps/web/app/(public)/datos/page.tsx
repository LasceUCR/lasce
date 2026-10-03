import type { Metadata } from 'next'
import { ArrowDown } from 'lucide-react'

import { ScientificDataExplorer } from '@/app/components/public/scientific-data/ScientificDataExplorer'
import { SolarTodayLive } from '@/app/components/public/scientific-data/SolarTodayLive'
import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'
import { loginRedirectPath } from '@/app/lib/auth/session-token'
import { goesInstruments, scientificSources } from '@/app/lib/scientific-data'
import { getGoesAvailability } from '@/app/lib/scientific-data-availability'
import { getInitialScientificQuery } from '@/app/lib/scientific-data-navigation'

import { requestResourceDownload } from './actions'

const description = 'Explore imágenes del Sol y consulte la información científica disponible.'

export const metadata: Metadata = {
  title: 'Datos científicos | LASCE',
  description,
  alternates: { canonical: '/datos' },
}

export const dynamic = 'force-dynamic'

interface ScientificDataRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ScientificDataRoute({ searchParams }: ScientificDataRouteProps) {
  const today = new Date()
  const maxDate = today.toISOString().slice(0, 10)
  const initialQuery = getInitialScientificQuery(await searchParams, maxDate)
  // The page stays public: an anonymous visitor gets an empty grant set, not a redirect.
  // Grants only decide which download buttons are enabled; the Server Action checks again.
  const user = await getSessionUser()
  const grants = user ? [...(await getPermissionsForRole(user.role))] : []

  return (
    <article className="topic-page">
      <header className="data-page-header">
        <p className="topic-kicker">Portal público LASCE</p>
        <div className="data-page-title">
          <h1>Datos</h1>
          <a className="data-query-shortcut" href="#scientific-query-title">
            Ir a la consulta <ArrowDown aria-hidden="true" size={16} />
          </a>
        </div>
        <p className="topic-lead">{description}</p>
      </header>
      <SolarTodayLive
        instrument={goesInstruments.find((instrument) => instrument.code === 'SUVI')!}
        initialNow={today.toISOString()}
      />
      <ScientificDataExplorer
        key={`${initialQuery.source}:${initialQuery.product}`}
        goesAvailability={getGoesAvailability(today)}
        initialQuery={initialQuery}
        sources={scientificSources}
        signedIn={user !== null}
        downloadGrants={grants}
        loginHref={loginRedirectPath('/datos')}
        requestDownload={requestResourceDownload}
      />
    </article>
  )
}
