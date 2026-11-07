'use client'

import { ArrowRight, RefreshCw, Sun } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import { Select } from '@/app/components/public/Select'
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'
import { SkeletonImageCard } from '@/app/components/public/skeleton/SkeletonImageCard'
import type {
  ScientificImage,
  ScientificInstrument,
  ScientificProductCode,
} from '@/app/lib/scientific-data'
import { SuviImageSequence } from './SuviImageSequence'

/** How many moments of today the strip shows; `SolarTodayLive` picks this many images. */
export const SOLAR_TODAY_IMAGE_COUNT = 5

export interface SolarTodayProps {
  instrument: ScientificInstrument
  product: ScientificProductCode
  range: string
  date: string
  images: ScientificImage[]
  /** The GOES spacecraft that took `images`, when known. */
  satellite?: number
  state: 'loading' | 'success' | 'error'
  disabled?: boolean
  onProductChange: (product: ScientificProductCode) => void
  onRangeChange: (range: string) => void
  onRefresh: () => void
}

export function SolarToday({
  instrument,
  product,
  range,
  date,
  images,
  satellite,
  state,
  disabled,
  onProductChange,
  onRangeChange,
  onRefresh,
}: SolarTodayProps) {
  const t = useTranslations('scientificData.today')
  const format = useFormatter()
  const solarTimeRanges = [
    { value: 'day', label: t('ranges.day') },
    { value: '6', label: t('ranges.h6') },
    { value: '3', label: t('ranges.h3') },
    { value: '1', label: t('ranges.h1') },
  ]
  const selected = instrument.products.find((item) => item.code === product)
  const formattedDate = format.dateTime(new Date(`${date}T12:00:00Z`), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <section className="solar-today" aria-labelledby="solar-today-title">
      <div className="solar-today-heading">
        <div>
          <h2 id="solar-today-title">
            <Sun aria-hidden="true" size={22} /> {t('title')}
          </h2>
          <p className="solar-today-lead">{t('lead')}</p>
        </div>
        <span className="solar-today-source">
          {t('source')} <span aria-hidden="true">·</span> {instrument.code}
        </span>
      </div>

      <div className="solar-today-controls">
        <fieldset className="data-wavelengths" disabled={disabled}>
          <legend>{t('wavelengthsLegend')}</legend>
          <div className="data-wavelength-options">
            {instrument.products.map((item) => (
              <label key={item.code}>
                <input
                  type="radio"
                  name="today-wavelength"
                  value={item.code}
                  checked={product === item.code}
                  disabled={!item.available}
                  onChange={() => onProductChange(item.code)}
                />
                <span>{item.wavelength ?? item.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="solar-today-range data-field">
          <label htmlFor="solar-today-range">{t('rangeLabel')}</label>
          <Select
            id="solar-today-range"
            label={t('rangeLabel')}
            value={range}
            options={solarTimeRanges}
            onChange={onRangeChange}
            disabled={disabled}
          />
        </div>
      </div>

      {/* While loading, the strip's own layout holds one placeholder per image, so nothing moves
          when the images replace them. */}
      <LoadingRegion
        id="solar-today-results"
        label={t('loading')}
        loading={state === 'loading'}
        skeleton={
          <div className="solar-today-strip">
            <ul className="data-image-grid data-image-strip">
              {Array.from({ length: SOLAR_TODAY_IMAGE_COUNT }, (_, index) => (
                <li key={index}>
                  <SkeletonImageCard />
                </li>
              ))}
            </ul>
          </div>
        }
      >
        {state === 'error' ? (
          <Notice tone="error" role="alert">
            {t('error')}
          </Notice>
        ) : images.length === 0 ? (
          <div className="solar-today-empty" role="status">
            <Sun aria-hidden="true" size={32} strokeWidth={1.4} />
            <h3>{t('emptyTitle')}</h3>
            <p>{t('emptyMessage')}</p>
          </div>
        ) : (
          <div
            className="solar-today-strip"
            role="region"
            aria-label={t('stripLabel')}
            tabIndex={0}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const strip = event.currentTarget
              const left =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? strip.scrollWidth
                    : strip.scrollLeft + strip.clientWidth * (event.key === 'ArrowRight' ? 1 : -1)
              strip.scrollTo({ left, behavior: 'instant' })
            }}
          >
            <SuviImageSequence
              images={images}
              productName={selected?.name ?? product}
              satellite={satellite}
              variant="strip"
            />
          </div>
        )}
      </LoadingRegion>

      <div className="solar-today-footer">
        <p>{t('footer', { date: formattedDate, wavelength: selected?.wavelength ?? '' })}</p>
        <span className="solar-today-scroll-hint">
          {t('scrollHint')} <ArrowRight size={14} aria-hidden="true" />
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || state === 'loading'}
          icon={<RefreshCw size={15} aria-hidden="true" />}
          onClick={onRefresh}
        >
          {t('refresh')}
        </Button>
      </div>
    </section>
  )
}
