'use client'

import { ArrowRight, RefreshCw, Sun } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import { Select } from '@/app/components/public/Select'
import type {
  ScientificImage,
  ScientificInstrument,
  ScientificProductCode,
} from '@/app/lib/scientific-data'
import { SuviImageSequence } from './SuviImageSequence'

export const solarTimeRanges = [
  { value: 'day', label: 'Todo el día' },
  { value: '6', label: 'Últimas 6 horas' },
  { value: '3', label: 'Últimas 3 horas' },
  { value: '1', label: 'Última hora' },
]

export interface SolarTodayProps {
  instrument: ScientificInstrument
  product: ScientificProductCode
  range: string
  date: string
  images: ScientificImage[]
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
  state,
  disabled,
  onProductChange,
  onRangeChange,
  onRefresh,
}: SolarTodayProps) {
  const selected = instrument.products.find((item) => item.code === product)
  const formattedDate = new Intl.DateTimeFormat('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

  return (
    <section className="solar-today" aria-labelledby="solar-today-title">
      <div className="solar-today-heading">
        <div>
          <h2 id="solar-today-title">
            <Sun aria-hidden="true" size={22} /> El Sol de hoy
          </h2>
          <p className="solar-today-lead">
            Imágenes de hoy en distintas bandas de luz ultravioleta.
          </p>
        </div>
        <span className="solar-today-source">
          Fuente: GOES <span aria-hidden="true">·</span> {instrument.code}
        </span>
      </div>

      <div className="solar-today-controls">
        <fieldset className="data-wavelengths" disabled={disabled}>
          <legend>Bandas SUVI (longitud de onda)</legend>
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
          <label htmlFor="solar-today-range">Rango de hoy (UTC)</label>
          <Select
            id="solar-today-range"
            label="Rango de hoy (UTC)"
            value={range}
            options={solarTimeRanges}
            onChange={onRangeChange}
            disabled={disabled}
          />
        </div>
      </div>

      {state === 'loading' ? (
        <div className="solar-today-loading" role="status">
          <span>Cargando imágenes del Sol de hoy…</span>
          <div className="solar-today-placeholders" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index}>
                <Sun size={40} strokeWidth={1} />
              </div>
            ))}
          </div>
        </div>
      ) : state === 'error' ? (
        <Notice tone="error" role="alert">
          No fue posible cargar las imágenes de GOES. Puede cambiar de banda o volver a intentarlo.
        </Notice>
      ) : images.length === 0 ? (
        <div className="solar-today-empty" role="status">
          <Sun aria-hidden="true" size={32} strokeWidth={1.4} />
          <h3>Aún no hay imágenes para esta selección</h3>
          <p>
            Pruebe otra banda o amplíe el rango de hoy. Las nuevas observaciones aparecerán cuando
            estén disponibles.
          </p>
        </div>
      ) : (
        <div
          className="solar-today-strip"
          role="region"
          aria-label="Imágenes del Sol de hoy"
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
          <SuviImageSequence images={images} variant="strip" />
        </div>
      )}

      <div className="solar-today-footer">
        <p>
          {formattedDate} · {selected?.wavelength} · Horas en UTC
        </p>
        <span className="solar-today-scroll-hint">
          Deslice para ver más <ArrowRight size={14} aria-hidden="true" />
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || state === 'loading'}
          icon={<RefreshCw size={15} aria-hidden="true" />}
          onClick={onRefresh}
        >
          Actualizar imágenes
        </Button>
      </div>
    </section>
  )
}
