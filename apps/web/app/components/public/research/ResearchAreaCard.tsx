import { ArrowRight } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/app/components/public/Button'
import { MediaFrame } from '@/app/components/public/gallery/MediaFrame'

export interface ResearchAreaCardProps {
  title: string
  description: string
  /** The area's detail page, `/investigacion/areas/<slug>`. */
  href: string
  src?: string
}

/**
 * One research area on `/investigacion`, laid out like a `/noticias` card: the photograph in a
 * fixed column, then the title, a three-line summary and the link to the detail page.
 */
export function ResearchAreaCard({ title, description, href, src }: ResearchAreaCardProps) {
  const titleId = useId()

  return (
    <article aria-labelledby={titleId} className="surface-card research-area-card">
      {/* Decorative (`alt=""`): the title beside it is the real text, and `ResearchArea` has no
          field for a description of the photograph. */}
      <MediaFrame
        alt=""
        className="research-area-card-image"
        placeholder="Imagen del área de investigación"
        sizes="(max-width: 700px) 100vw, 280px"
        src={src}
      />

      <div className="research-area-card-content">
        <h3 id={titleId}>{title}</h3>

        <p className="research-area-card-description">{description}</p>

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
            Conozca más sobre esta área <span className="sr-only">({title})</span>
          </Button>
        </div>
      </div>
    </article>
  )
}
