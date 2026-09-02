export type MetricTone = 'blue' | 'cyan' | 'teal'

export interface MetricCardProps {
  label: string
  value: string
  status?: string
  updatedAt?: string
  detail?: string
  tone?: MetricTone
}

export function MetricCard({
  label,
  value,
  status,
  updatedAt,
  detail,
  tone = 'blue',
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <p>{label}</p>
      <strong>{status ? `${value} · ${status}` : value}</strong>
      {updatedAt ? <small>Actualizado: {updatedAt}</small> : null}
      {detail ? <span className="visually-hidden">{detail}</span> : null}
    </article>
  )
}
