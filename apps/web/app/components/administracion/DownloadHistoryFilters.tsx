'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { Select } from '@/app/components/public/Select'
import type { DownloadHistoryPage } from '@/app/lib/download-history'

export interface DownloadHistoryFiltersProps {
  /** The route the form submits to, e.g. `/administracion/descargas`. */
  pathname: string
  filters: DownloadHistoryPage['filters']
  options: DownloadHistoryPage['options']
  filtered: boolean
}

/**
 * The filter form of the Descargas section. Like the Auditoría one it is a plain GET form (it
 * shares its `audit-*` styles): the shared `Select` is not a native control, so each choice is
 * mirrored into a hidden input the browser submits. Submitting restarts at page 1 because the
 * form carries no `page`.
 */
export function DownloadHistoryFilters({
  pathname,
  filters,
  options,
  filtered,
}: DownloadHistoryFiltersProps) {
  const t = useTranslations('administration.downloads')
  const [from, setFrom] = useState(filters.from)
  const [to, setTo] = useState(filters.to)
  const [source, setSource] = useState(filters.source)
  const [instrument, setInstrument] = useState(filters.instrument)
  const [format, setFormat] = useState(filters.format)
  const [user, setUser] = useState(filters.user)

  return (
    <form
      method="get"
      action={pathname}
      className="audit-filters"
      aria-label={t('filters.label')}
      data-select-boundary
    >
      <div className="data-field">
        <label htmlFor="downloads-from">{t('filters.from')}</label>
        <input
          id="downloads-from"
          type="date"
          name="from"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
        />
      </div>
      <div className="data-field">
        <label htmlFor="downloads-to">{t('filters.to')}</label>
        <input
          id="downloads-to"
          type="date"
          name="to"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <div className="data-field">
        <label htmlFor="downloads-source">{t('filters.source')}</label>
        <Select
          id="downloads-source"
          label={t('filters.source')}
          value={source}
          onChange={setSource}
          options={[
            { value: '', label: t('filters.allSources') },
            ...options.sources.map((item) => ({ value: item, label: item })),
          ]}
        />
        <input type="hidden" name="source" value={source} />
      </div>
      <div className="data-field">
        <label htmlFor="downloads-instrument">{t('filters.instrument')}</label>
        <Select
          id="downloads-instrument"
          label={t('filters.instrument')}
          value={instrument}
          onChange={setInstrument}
          options={[
            { value: '', label: t('filters.allInstruments') },
            ...options.instruments.map((item) => ({ value: item, label: item })),
          ]}
        />
        <input type="hidden" name="instrument" value={instrument} />
      </div>
      <div className="data-field">
        <label htmlFor="downloads-format">{t('filters.format')}</label>
        <Select
          id="downloads-format"
          label={t('filters.format')}
          value={format}
          onChange={setFormat}
          options={[
            { value: '', label: t('filters.allFormats') },
            ...options.formats.map((item) => ({ value: item, label: item.toUpperCase() })),
          ]}
        />
        <input type="hidden" name="format" value={format} />
      </div>
      <div className="data-field">
        <label htmlFor="downloads-user">{t('filters.user')}</label>
        <Select
          id="downloads-user"
          label={t('filters.user')}
          value={user}
          onChange={setUser}
          options={[
            { value: '', label: t('filters.allUsers') },
            ...options.users.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <input type="hidden" name="user" value={user} />
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
