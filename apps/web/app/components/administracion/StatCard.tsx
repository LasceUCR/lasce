import Link from 'next/link'

export type StatCardTone = 'blue' | 'cyan' | 'teal' | 'orange'

export interface StatCardProps {
  label: string
  value: string
  tone: StatCardTone
  /** Makes the whole card a link, e.g. to the page where the counted content lives. */
  href?: string
  /** `value` is a "no data" message rather than a figure, and is shown smaller. */
  isEmpty?: boolean
}

export function StatCard({ label, value, tone, href, isEmpty = false }: StatCardProps) {
  const className = `indicator indicator-${tone}${isEmpty ? ' indicator-empty' : ''}`
  const content = (
    <>
      <p>{label}</p>
      <strong>{value}</strong>
    </>
  )

  return href ? (
    <Link className={`${className} indicator-link`} href={href}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  )
}
