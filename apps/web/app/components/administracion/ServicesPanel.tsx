'use client'

import { useTranslations } from 'next-intl'

import { SERVICE_NAMES, type ServiceStatus, type ServiceStatuses } from '@/app/lib/service-status'

import type { StatusTone } from './StatusPill'
import { useServiceStatuses } from './useServiceStatuses'

const toneByStatus: Record<ServiceStatus, StatusTone> = {
  ok: 'green',
  down: 'red',
  checking: 'blue',
}

export interface ServicesPanelProps {
  statuses: ServiceStatuses
}

/** The Servicios card of the administration summary: one row per service with its state. */
export function ServicesPanel({ statuses }: ServicesPanelProps) {
  const t = useTranslations('administration.services')

  return (
    <section className="surface-card" aria-labelledby="admin-services-title">
      <h2 id="admin-services-title">{t('title')}</h2>
      <ul className="admin-status-list">
        {SERVICE_NAMES.map((name) => {
          const status = statuses[name]
          return (
            <li key={name}>
              <span className="admin-status-name">
                <span
                  aria-hidden="true"
                  className={`status-pill-dot status-pill-${toneByStatus[status]}`}
                />
                {t(`names.${name}`)}
              </span>
              <span className="admin-status-value">{t(`status.${status}`)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** `ServicesPanel` fed by the health endpoints, checked once when the summary opens. */
export function LiveServicesPanel() {
  return <ServicesPanel statuses={useServiceStatuses()} />
}
