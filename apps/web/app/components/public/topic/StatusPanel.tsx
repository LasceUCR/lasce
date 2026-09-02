import { useId } from 'react'

export interface StatusPanelProps {
  title: string
  level: string
  levelDescription: string
  summary: string
  alertsTitle?: string
  alerts: readonly string[]
  forecastTitle?: string
  forecast: string
}

export function StatusPanel({
  title,
  level,
  levelDescription,
  summary,
  alertsTitle = 'Alertas activas',
  alerts,
  forecastTitle = 'Pronóstico breve',
  forecast,
}: StatusPanelProps) {
  const titleId = useId()

  return (
    <aside aria-labelledby={titleId} className="surface-card status-panel">
      <h3 id={titleId}>{title}</h3>
      <p className="status-semaphore">
        <span className="status-semaphore-dot" aria-hidden="true" />
        <span>
          Semáforo: {level}. {levelDescription}.
        </span>
      </p>
      <p>{summary}</p>
      <h4>{alertsTitle}</h4>
      <ul>
        {alerts.map((alert) => (
          <li key={alert}>{alert}</li>
        ))}
      </ul>
      <h4>{forecastTitle}</h4>
      <p>{forecast}</p>
    </aside>
  )
}
