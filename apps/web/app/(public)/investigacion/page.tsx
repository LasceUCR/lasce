import type { Metadata } from 'next'

import { PublicationsExplorer } from '@/app/components/public/publications/PublicationsExplorer'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import {
  getPublications,
  investigacionBackLink,
  investigacionHero,
  investigacionMeta,
} from '@/app/lib/publications'

export const metadata: Metadata = {
  title: investigacionMeta.title,
  description: investigacionMeta.description,
}

/**
 * `getPublications()` reads from Postgres, which isn't reachable during
 * `next build` (CI's `build` job and the Docker image build both build
 * without a database). Without this, Next tries to prerender the page at
 * build time and the build fails on a connection error — render at request
 * time instead, same reason `app/api/health/route.ts` does the same.
 */
export const dynamic = 'force-dynamic'

export default async function InvestigacionPage() {
  const publications = await getPublications()

  return (
    <article className="topic-page">
      <TopicHero
        kicker={investigacionHero.kicker}
        lead={investigacionHero.lead}
        title={investigacionHero.title}
      />

      <PublicationsExplorer publications={publications} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={investigacionBackLink.href} label={investigacionBackLink.label} />
      </div>
    </article>
  )
}
