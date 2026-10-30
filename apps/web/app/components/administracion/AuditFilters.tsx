'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { Select } from '@/app/components/public/Select'
import type { AuditTrailPage as AuditTrailData } from '@/app/lib/audit-trail'

export interface AuditFiltersProps {
  /** The route the form submits to, e.g. `/administracion/auditoria`. */
  pathname: string
  filters: AuditTrailData['filters']
  options: AuditTrailData['options']
  filtered: boolean
}

/**
 * The filter form of the Auditoría section. It is still a plain GET form: the shared `Select` is
 * not a native control, so each choice is mirrored into a hidden input that the browser submits.
 */
export function AuditFilters({ pathname, filters, options, filtered }: AuditFiltersProps) {
  const t = useTranslations('administration.audit')
  const [actor, setActor] = useState(filters.actor)
  const [entityType, setEntityType] = useState(filters.entityType)
  const [action, setAction] = useState(filters.action)
  const [from, setFrom] = useState(filters.from)
  const [to, setTo] = useState(filters.to)

  return (
    <form
      method="get"
      action={pathname}
      className="audit-filters"
      aria-label={t('filters.label')}
      data-select-boundary
    >
      <div className="data-field">
        <label htmlFor="audit-from">{t('filters.from')}</label>
        <input
          id="audit-from"
          type="date"
          name="from"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
        />
      </div>
      <div className="data-field">
        <label htmlFor="audit-to">{t('filters.to')}</label>
        <input
          id="audit-to"
          type="date"
          name="to"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <div className="data-field">
        <label htmlFor="audit-actor">{t('filters.actor')}</label>
        <Select
          id="audit-actor"
          label={t('filters.actor')}
          value={actor}
          onChange={setActor}
          options={[
            { value: '', label: t('filters.allActors') },
            ...options.actors.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <input type="hidden" name="actor" value={actor} />
      </div>
      <div className="data-field">
        <label htmlFor="audit-entity">{t('filters.entityType')}</label>
        <Select
          id="audit-entity"
          label={t('filters.entityType')}
          value={entityType}
          onChange={setEntityType}
          options={[
            { value: '', label: t('filters.allEntityTypes') },
            ...options.entityTypes.map((item) => ({ value: item, label: item })),
          ]}
        />
        <input type="hidden" name="entity" value={entityType} />
      </div>
      <div className="data-field">
        <label htmlFor="audit-action">{t('filters.action')}</label>
        <Select
          id="audit-action"
          label={t('filters.action')}
          value={action}
          onChange={setAction}
          options={[
            { value: '', label: t('filters.allActions') },
            ...options.actions.map((item) => ({ value: item, label: item })),
          ]}
        />
        <input type="hidden" name="action" value={action} />
      </div>
      <div className="audit-actions">
        <Button icon={<Search aria-hidden="true" size={18} strokeWidth={1.8} />} type="submit">
          {t('filters.apply')}
        </Button>
        {filtered ? (
          <Button variant="secondary" href={pathname}>
            {t('filters.clear')}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
