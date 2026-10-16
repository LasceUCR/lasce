import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Button } from '@/app/components/public/Button'
import { TruncatedText } from '@/app/components/public/TruncatedText'
import { MediaFrame } from '@/app/components/public/gallery/MediaFrame'

export interface ResearchAreaCardProps {
  title: string
  description: string
  /** The area's detail page, `/investigacion/areas/<slug>`. */
  href: string
  src?: string
  /**
   * The language `title` and `description` are in, from `contentLangAttribute`: `''` for text
   * whose language is unknown, and no attribute when it is the page's.
   */
  contentLang?: string
}

/**
 * One research area on `/investigacion`, laid out like a `/noticias` card: the photograph in a
 * fixed column, then the title, a three-line summary and the link to the detail page.
 */
export function ResearchAreaCard({
  title,
  description,
  href,
  src,
  contentLang,
}: ResearchAreaCardProps) {
  const t = useTranslations('researchAreas.card')
  const titleId = useId()

  return (
    <article aria-labelledby={titleId} className="surface-card research-area-card">
      {/* Decorative (`alt=""`): the title beside it is the real text, and `ResearchArea` has no
          field for a description of the photograph. */}
      <MediaFrame
        alt=""
        className="research-area-card-image"
        placeholder={t('imagePlaceholder')}
        sizes="(max-width: 700px) 100vw, 280px"
        src={src}
      />

      <div className="research-area-card-content">
        <h3 id={titleId} lang={contentLang}>
          {title}
        </h3>

        {/* Three lines keep every card the same height; "Leer más" shows the rest in place. */}
        <TruncatedText className="research-area-card-description" lang={contentLang} lines={3}>
          {description}
        </TruncatedText>

        <div className="research-area-card-action">
          <Button
            href={href}
            icon={<ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />}
            variant="primary"
          >
            {/* Every card has the same visible label, so the title makes each link's
                accessible name unique for a screen reader's list of links. The space sits in
                the label, not the span: Chromium pads the span (a flex item) with a space and
                jsdom trims it, so only a space outside it gives both the same name. */}
            {t('readMore')}{' '}
            <span className="sr-only" lang={contentLang}>
              ({title})
            </span>
          </Button>
        </div>
      </div>
    </article>
  )
}
