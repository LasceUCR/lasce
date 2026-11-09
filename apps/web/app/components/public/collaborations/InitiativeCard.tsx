'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import type { CollaborationInitiative } from '@/app/lib/collaborations'
import { InitiativeDescription } from './InitiativeDescription'
import styles from './InitiativeCard.module.css'

export interface InitiativeCardProps {
  initiative: CollaborationInitiative
}

export function InitiativeCard({ initiative }: InitiativeCardProps) {
  const t = useTranslations('initiatives')
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const logo = initiative.logo?.src !== failedLogo ? initiative.logo : undefined

  return (
    <article
      aria-label={initiative.title}
      className={`topic-initiative ${logo ? 'topic-initiative-with-logo' : ''}`}
    >
      {logo ? (
        <Image
          alt={logo.alt || t('logoAlt', { title: initiative.title })}
          className={`topic-initiative-logo ${styles.logo}`}
          height={logo.height}
          width={logo.width}
          src={logo.src}
          unoptimized
          onError={() => setFailedLogo(logo.src)}
        />
      ) : null}
      <div className={`topic-initiative-copy ${styles.copy}`}>
        <div lang={initiative.contentLocale === null ? '' : initiative.contentLocale}>
          <h3>{initiative.title}</h3>
          <InitiativeDescription paragraphs={initiative.paragraphs} />
        </div>
        {initiative.href ? (
          <Button
            href={initiative.href}
            icon={<ExternalLink aria-hidden="true" size={18} strokeWidth={1.8} />}
            rel="noopener noreferrer"
            target="_blank"
            variant="brand"
          >
            {initiative.linkLabel ?? t('officialSite')}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
