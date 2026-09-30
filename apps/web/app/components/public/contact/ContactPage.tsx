import { ExternalLink, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  availableContactChannels,
  type ContactChannel,
  type ContactContent,
} from '@/app/lib/contact'

function channelIcon(id: string): ReactNode {
  if (id === 'phone') return <Phone size={22} strokeWidth={1.8} />
  if (id === 'location') return <MapPin size={22} strokeWidth={1.8} />
  if (id === 'instagram') return <ExternalLink size={22} strokeWidth={1.8} />
  return null
}

function channelBody(channel: ContactChannel): ReactNode {
  if (channel.href) {
    return (
      <p>
        <a
          href={channel.href}
          rel={channel.external ? 'noreferrer' : undefined}
          target={channel.external ? '_blank' : undefined}
        >
          {channel.value}
        </a>
      </p>
    )
  }

  return (channel.lines ?? (channel.value ? [channel.value] : [])).map((line) => (
    <p key={line}>{line}</p>
  ))
}

export interface ContactPageProps {
  content: ContactContent
}

export function ContactPage({ content }: ContactPageProps) {
  const channels = availableContactChannels(content.channels)

  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />
      {channels.length > 0 ? (
        <TopicSection
          id="informacion-de-contacto"
          title={content.channelsTitle}
          titleId="informacion-de-contacto-titulo"
        >
          <CardGrid columns={3} equalHeight>
            {channels.map((channel) => (
              <InfoCard
                description={channelBody(channel)}
                icon={channelIcon(channel.id)}
                key={channel.id}
                title={channel.label}
              />
            ))}
          </CardGrid>
        </TopicSection>
      ) : null}
      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
