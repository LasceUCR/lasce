import { useFormatter, useTranslations } from 'next-intl'

import { SUMMARY_CARDS, type ContentSummary } from '@/app/lib/summary-cards'

import { StatCard, type StatCardTone } from './StatCard'

const tones: StatCardTone[] = ['blue', 'cyan', 'teal', 'orange']

export interface ContentSummaryCardsProps {
  summary: ContentSummary
}

/** The stat cards of the administration summary. A category with nothing in it says so. */
export function ContentSummaryCards({ summary }: ContentSummaryCardsProps) {
  const t = useTranslations('administration.content')
  const format = useFormatter()

  return (
    <section aria-label={t('title')} className="indicator-grid admin-summary-grid">
      {SUMMARY_CARDS.map(({ key, href }, index) => {
        const count = summary[key]
        return (
          <StatCard
            href={href}
            isEmpty={count === 0}
            key={key}
            label={t(`cards.${key}`)}
            tone={tones[index % tones.length]!}
            value={count === 0 ? t('empty') : format.number(count)}
          />
        )
      })}
    </section>
  )
}
