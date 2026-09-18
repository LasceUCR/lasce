export type StatCardTone = 'blue' | 'cyan' | 'teal' | 'orange'

export interface StatCardProps {
  label: string
  value: string
  tone: StatCardTone
}

export function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <article className={`indicator indicator-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}
