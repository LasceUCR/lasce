import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import type { SolarPhysicsSection } from '@/app/lib/solar-physics-section-schema'

export interface LasceSectionViewProps {
  section: SolarPhysicsSection
}

/**
 * The "El trabajo de LASCE en Física Solar" section as a visitor reads it: the title and one
 * paragraph per blank-line-separated block of the stored text, each marked with the language it
 * is actually in (`''` for a legacy section whose language is unknown).
 */
export function LasceSectionView({ section }: LasceSectionViewProps) {
  return (
    <TopicSection
      featured
      className="topic-section-end"
      title={section.title}
      titleId="solar-lasce-title"
    >
      {section.paragraphs.map((text, index) => (
        <p
          className="topic-intro"
          key={`${index}-${text}`}
          lang={contentLangAttribute(section.contentLocale)}
        >
          {text}
        </p>
      ))}
    </TopicSection>
  )
}
