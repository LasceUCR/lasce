import type { Metadata } from 'next'

import { ResearchAreasSection } from '@/app/components/public/research/ResearchAreasSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import {
  investigacionBackLink,
  investigacionHero,
  investigacionMeta,
  researchAreas,
} from '@/app/lib/research-areas'

export const metadata: Metadata = {
  title: investigacionMeta.title,
  description: investigacionMeta.description,
}

export default async function InvestigacionPage() {
  const [canCreate, canEdit, canDelete] = await Promise.all([
      userHasPermission('create_components'),
      userHasPermission('edit_components'),
      userHasPermission('delete_components'),
    ])

  return (
    <article className="topic-page">
      <TopicHero
        kicker={investigacionHero.kicker}
        lead={investigacionHero.lead}
        title={investigacionHero.title}
      />

      <ResearchAreasSection
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        areas={researchAreas}
        id="research-areas"
        subtitle="Principales temas de investigación desarrollados por el LASCE."
        title="Áreas de investigación"
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={investigacionBackLink.href} label={investigacionBackLink.label} />
      </div>
    </article>
  )
}
