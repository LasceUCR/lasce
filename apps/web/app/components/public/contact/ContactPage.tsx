import { MapPin, Phone } from 'lucide-react'
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

/** lucide-react 1.34 does not export an Instagram icon. Same stroke style as Phone and MapPin. */
function InstagramIcon() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function channelIcon(id: string): ReactNode {
  if (id === 'phone') return <Phone size={22} strokeWidth={1.8} />
  if (id === 'location') return <MapPin size={22} strokeWidth={1.8} />
  if (id === 'instagram') return <InstagramIcon />
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
