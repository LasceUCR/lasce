import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import type { SpaceWeatherSection } from '@/app/lib/space-weather-section-schema'

export interface CostaRicaSectionViewProps {
  section: SpaceWeatherSection
  /** The section's number on its page ("2" shows as "2. …"), so the page numbers every section in order. */
  index?: string
}

/**
 * The "¿Por qué estudiarlo desde Costa Rica?" card as a visitor reads it: the title and one
 * paragraph per blank-line-separated block of the stored text, all marked with the language they
 * are actually in (`''` for a legacy section whose language is unknown, nothing for the page's).
 */
export function CostaRicaSectionView({ section, index }: CostaRicaSectionViewProps) {
  const lang = contentLangAttribute(section.contentLocale)

  return (
    <TopicSection
      featured
      index={index}
      title={section.title}
      titleId="sw-costa-rica-title"
      titleLang={lang}
    >
      {section.paragraphs.map((paragraph, index) => (
        <p className="topic-intro" key={`${index}-${paragraph}`} lang={lang}>
          {paragraph}
        </p>
      ))}
    </TopicSection>
  )
}
