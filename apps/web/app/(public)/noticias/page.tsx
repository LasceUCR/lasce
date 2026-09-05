import type { Metadata } from 'next'

import { NewsExplorer } from '@/app/components/public/news/NewsExplorer'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import {
  noticiasBackLink,
  noticiasHero,
  noticiasMeta,
  news,
} from '@/app/lib/news'

export const metadata: Metadata = {
  title: noticiasMeta.title,
  description: noticiasMeta.description,
}

export default function NoticiasPage() {
  return (
    <article className="topic-page">
      <TopicHero
        kicker={noticiasHero.kicker}
        lead={noticiasHero.lead}
        title={noticiasHero.title}
      />

      <ContentFlag
        label="Información provisional"
        message="El contenido de esta página es preliminar y está sujeto a revisión."
      />

      <NewsExplorer news={news} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={noticiasBackLink.href} label={noticiasBackLink.label} />
      </div>
    </article>
  )
}
