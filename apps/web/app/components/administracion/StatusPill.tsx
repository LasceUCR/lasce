export type StatusTone = 'green' | 'orange' | 'blue'

export interface StatusPillProps {
  label: string
  tone: StatusTone
  showDot?: boolean
}

export function StatusPill({ label, tone, showDot = true }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill-${tone}`}>
      {showDot ? <span className="status-pill-dot" aria-hidden="true" /> : null}
      {label}
    </span>
  )
}
