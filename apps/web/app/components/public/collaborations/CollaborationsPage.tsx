import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { ResearchCollaborationsSection } from '@/app/components/public/research/ResearchCollaborationsSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { CollaborationsContent } from '@/app/lib/collaborations'
import type { ResearchCollaboration } from '@/app/lib/research-collaborations'

export interface CollaborationsPageProps {
  content: CollaborationsContent
  collaborations: ResearchCollaboration[]
}

export function CollaborationsPage({ content, collaborations }: CollaborationsPageProps) {
  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />

      <ResearchCollaborationsSection collaborations={collaborations} />

      <TopicSection
        title={content.initiatives.title}
        titleId="collaborations-initiatives-title"
        wide
      >
        {content.initiatives.items.map((item) => (
          <div
            className={
              item.logo ? 'topic-initiative topic-initiative-with-logo' : 'topic-initiative'
            }
            key={item.id}
          >
            {item.logo ? (
              <Image
                alt={item.logo.alt}
                className="topic-initiative-logo"
                height={item.logo.height}
                src={item.logo.src}
                width={item.logo.width}
              />
            ) : null}
            <div>
              <h3>{item.title}</h3>
              {item.paragraphs.map((paragraph) => (
                <p className="topic-intro" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              {item.href && item.linkLabel ? (
                <Button
                  href={item.href}
                  icon={<ExternalLink aria-hidden="true" size={18} strokeWidth={1.8} />}
                  rel="noopener noreferrer"
                  target="_blank"
                  variant="brand"
                >
                  {item.linkLabel}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
