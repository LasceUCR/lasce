import type { IndicatorTone } from '@/app/lib/home-schema'

export interface IndicatorCardProps {
  /** The index's name, e.g. "Índice Kp". */
  label: string
  /** Shared by every language, e.g. "-12 nT". */
  value: string
  /** In the visitor's language, e.g. "Estable". */
  description: string
  tone: IndicatorTone
  /** The description's language, from `contentLangAttribute`. */
  descriptionLang?: string
}

/** One geomagnetic index on the home page: its name above "value · description". */
export function IndicatorCard({
  label,
  value,
  description,
  tone,
  descriptionLang,
}: IndicatorCardProps) {
  return (
    <article className={`indicator indicator-${tone}`}>
      <p>{label}</p>
      <strong>
        {value} · <span lang={descriptionLang}>{description}</span>
      </strong>
    </article>
  )
}
