'use client'

import { ChartNoAxesCombined, Images, Search } from 'lucide-react'
import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'

import { DataTable } from '@/app/components/public/DataTable'
import { Notice } from '@/app/components/public/Notice'
import { Button } from '@/app/components/public/Button'
import {
  findScientificProduct,
  getDefaultQueryForSource,
  scientificDataQuerySchema,
  scientificDataResultSchema,
  type ScientificDataQuery,
  type ScientificDataResult,
  type ScientificProductCode,
  type ScientificSource,
  type ScientificSourceCode,
} from '@/app/lib/scientific-data'

import { DynamicSpectrumChart } from './DynamicSpectrumChart'
import { ScientificDataChart } from './ScientificDataChart'
import { SuviImageSequence } from './SuviImageSequence'

export interface ScientificDataExplorerProps {
  sources: ScientificSource[]
  initialQuery: ScientificDataQuery
  initialResult?: ScientificDataResult
  goesDateRange: { min: string; max: string }
}

type RequestState = 'idle' | 'loading' | 'success' | 'error'

const subscribeToHydration = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

const dateFormatter = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

const valueFormatter = new Intl.NumberFormat('es-CR', {
  maximumSignificantDigits: 5,
  notation: 'scientific',
})

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00Z`))
}

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

function getValidationMessage(query: ScientificDataQuery) {
  const parsed = scientificDataQuerySchema.safeParse(query)
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? 'Revise los criterios.')
}

export function ScientificDataExplorer({
  sources,
  initialQuery,
  initialResult,
  goesDateRange,
}: ScientificDataExplorerProps) {
  // Server-rendered controls must wait for React's handlers before accepting input.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<ScientificDataResult | null>(initialResult ?? null)
  const [requestState, setRequestState] = useState<RequestState>(initialResult ? 'success' : 'idle')
  const [message, setMessage] = useState<string | null>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const controlsDisabled = !hydrated || requestState === 'loading'

  const selectedSource = sources.find((source) => source.code === query.source)!
  const selected = useMemo(
    () => findScientificProduct(query.source, query.product),
    [query.product, query.source],
  )
  const invalidRange = query.startTime >= query.endTime

  function resetResults() {
    setResult(null)
    setRequestState('idle')
    setMessage(null)
  }

  function updateQuery<Key extends keyof ScientificDataQuery>(
    key: Key,
    value: ScientificDataQuery[Key],
  ) {
    setQuery((current) => ({ ...current, [key]: value }))
    resetResults()
  }

  function selectSource(sourceCode: ScientificSourceCode) {
    const source = sources.find((candidate) => candidate.code === sourceCode)!
    const requestedDate =
      sourceCode === 'GOES' && (query.date < goesDateRange.min || query.date > goesDateRange.max)
        ? goesDateRange.max
        : query.date

    setQuery(getDefaultQueryForSource(source, requestedDate))
    resetResults()
  }

  function selectProduct(productCode: ScientificProductCode) {
    const selection = findScientificProduct(query.source, productCode)!
    setQuery((current) => ({
      ...current,
      product: productCode,
      parameter: selection.product.parameters[0]!.code,
    }))
    resetResults()
  }

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationMessage = getValidationMessage(query)
    if (validationMessage) {
      setRequestState('idle')
      setMessage(validationMessage)
      return
    }

    if (
      query.source === 'GOES' &&
      (query.date < goesDateRange.min || query.date > goesDateRange.max)
    ) {
      setMessage('Seleccione una fecha dentro de la ventana disponible de NOAA.')
      return
    }

    setRequestState('loading')
    setMessage(null)

    try {
      const parameters = new URLSearchParams({
        source: query.source,
        product: query.product,
        parameter: query.parameter,
        date: query.date,
        startTime: query.startTime,
        endTime: query.endTime,
      })
      const response = await fetch(`/api/scientific-data?${parameters.toString()}`)
      if (!response.ok) throw new Error('Scientific data request failed')

      const parsed = scientificDataResultSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error('Scientific data response is invalid')

      setResult(parsed.data)
      setRequestState('success')
      requestAnimationFrame(() => resultsHeading.current?.focus())
    } catch {
      setResult(null)
      setRequestState('error')
      setMessage(
        query.source === 'GOES'
          ? 'No fue posible consultar NOAA en este momento. Inténtelo nuevamente más tarde.'
          : 'No fue posible consultar los datos. Inténtelo nuevamente.',
      )
    }
  }

  const seriesValues =
    result?.visualization === 'time-series' ? result.points.map((point) => point.value) : []
  const minimum = seriesValues.length > 0 ? Math.min(...seriesValues) : null
  const maximum = seriesValues.length > 0 ? Math.max(...seriesValues) : null
  const latest = seriesValues.at(-1) ?? null
  const hasResults =
    result?.visualization === 'time-series'
      ? result.points.length > 0
      : result?.visualization === 'image-sequence'
        ? result.images.length > 0
        : (result?.cells.length ?? 0) > 0

  return (
    <section aria-labelledby="scientific-query-title" className="data-explorer">
      <div className="data-section-heading">
        <div>
          <p className="topic-kicker">Consulta pública</p>
          <h2 id="scientific-query-title">Configure los datos que desea visualizar</h2>
        </div>
        <span className="topic-badge">
          {selectedSource.dataKind === 'observed' ? 'Datos observados' : 'Simulación'}
        </span>
      </div>

      <Notice tone={query.source === 'GOES' ? 'info' : 'warning'}>
        {query.source === 'GOES' ? (
          <>
            GOES usa observaciones del servicio público de NOAA. Las series cubren los últimos siete
            días y las imágenes SUVI aproximadamente las últimas 24 horas. EHIS y MPSL requieren
            integrar y validar el archivo científico NetCDF antes de habilitarlos.
          </>
        ) : (
          <>
            ROSAC es una previsión de integración. Sus instrumentos y datos reales aún no están
            definidos; todos los resultados de esta fuente son simulados y están rotulados como tal.
          </>
        )}
      </Notice>

      <form className="data-query-form" noValidate onSubmit={submitQuery}>
        <div className="data-field">
          <label htmlFor="scientific-source">Fuente de datos</label>
          <select
            disabled={controlsDisabled}
            id="scientific-source"
            onChange={(event) => selectSource(event.target.value as ScientificSourceCode)}
            value={query.source}
          >
            {sources.map((source) => (
              <option key={source.code} value={source.code}>
                {source.name}
              </option>
            ))}
          </select>
          <span className="data-field-hint">{selectedSource.description}</span>
        </div>

        <div className="data-field">
          <label htmlFor="scientific-product">Producto científico</label>
          <select
            disabled={controlsDisabled}
            id="scientific-product"
            onChange={(event) => selectProduct(event.target.value as ScientificProductCode)}
            required
            value={query.product}
          >
            {selectedSource.instruments.map((instrument) => (
              <optgroup key={instrument.code} label={`${instrument.code} — ${instrument.name}`}>
                {instrument.products.map((product) => (
                  <option disabled={!product.available} key={product.code} value={product.code}>
                    {product.name} ({product.code}){product.available ? '' : ' — pendiente'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="data-field-hint">
            Instrumento: {selected?.instrument.code} — {selected?.instrument.name}
          </span>
          {selected?.product.availabilityNote ? (
            <span className="data-field-hint">{selected.product.availabilityNote}</span>
          ) : null}
        </div>

        <div className="data-field">
          <label htmlFor="scientific-parameter">Canal o parámetro</label>
          <select
            disabled={controlsDisabled}
            id="scientific-parameter"
            onChange={(event) => updateQuery('parameter', event.target.value)}
            value={query.parameter}
          >
            {selected?.product.parameters.map((parameter) => (
              <option key={parameter.code} value={parameter.code}>
                {parameter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="data-field">
          <label htmlFor="scientific-date">Fecha</label>
          <input
            disabled={controlsDisabled}
            id="scientific-date"
            max={query.source === 'GOES' ? goesDateRange.max : undefined}
            min={query.source === 'GOES' ? goesDateRange.min : undefined}
            onChange={(event) => updateQuery('date', event.target.value)}
            required
            type="date"
            value={query.date}
          />
          {query.source === 'GOES' ? (
            <span className="data-field-hint">
              Disponible del {goesDateRange.min} al {goesDateRange.max}.
            </span>
          ) : null}
        </div>

        <fieldset className="data-time-range">
          <legend>Rango horario (UTC)</legend>
          <div className="data-time-fields">
            <div className="data-field">
              <label htmlFor="scientific-start-time">Hora de inicio</label>
              <input
                disabled={controlsDisabled}
                aria-describedby={message ? 'scientific-query-message' : undefined}
                aria-invalid={message && invalidRange ? true : undefined}
                id="scientific-start-time"
                onChange={(event) => updateQuery('startTime', event.target.value)}
                required
                type="time"
                value={query.startTime}
              />
            </div>
            <div className="data-field">
              <label htmlFor="scientific-end-time">Hora de fin</label>
              <input
                disabled={controlsDisabled}
                aria-describedby={message ? 'scientific-query-message' : undefined}
                aria-invalid={message && invalidRange ? true : undefined}
                id="scientific-end-time"
                onChange={(event) => updateQuery('endTime', event.target.value)}
                required
                type="time"
                value={query.endTime}
              />
            </div>
          </div>
        </fieldset>

        <div className="data-query-submit">
          <Button
            disabled={controlsDisabled}
            icon={<Search aria-hidden="true" size={18} strokeWidth={1.8} />}
            type="submit"
          >
            {requestState === 'loading' ? 'Consultando…' : 'Consultar datos'}
          </Button>
        </div>
      </form>

      {message ? (
        <Notice id="scientific-query-message" tone="error" role="alert">
          {message}
        </Notice>
      ) : null}

      {requestState === 'loading' ? (
        <Notice role="status">Consultando las observaciones disponibles…</Notice>
      ) : null}

      {requestState === 'success' && result ? (
        <section aria-labelledby="scientific-results-title" className="data-results">
          <div className="data-section-heading">
            <div>
              <p className="topic-kicker">Resultados de la consulta</p>
              <h2 id="scientific-results-title" ref={resultsHeading} tabIndex={-1}>
                {result.product.name} ({result.product.code})
              </h2>
            </div>
            {result.visualization === 'image-sequence' ? (
              <Images aria-hidden="true" size={25} strokeWidth={1.6} />
            ) : (
              <ChartNoAxesCombined aria-hidden="true" size={25} strokeWidth={1.6} />
            )}
          </div>

          <dl className="data-metadata">
            <div>
              <dt>Instrumento</dt>
              <dd>{result.instrument.code}</dd>
            </div>
            <div>
              <dt>Canal</dt>
              <dd>{result.parameter.label}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatDate(result.query.date)}</dd>
            </div>
            <div>
              <dt>Intervalo</dt>
              <dd>
                {result.query.startTime}–{result.query.endTime} UTC
              </dd>
            </div>
            <div>
              <dt>Proveedor</dt>
              <dd>{result.origin.provider}</dd>
            </div>
            {result.origin.satellite ? (
              <div>
                <dt>Satélite</dt>
                <dd>GOES-{result.origin.satellite}</dd>
              </div>
            ) : null}
          </dl>

          <Notice tone={result.origin.kind === 'observed' ? 'info' : 'warning'}>
            {result.origin.notice}
          </Notice>

          {!hasResults ? (
            <div className="content-empty" role="status">
              <h3>No hay datos disponibles</h3>
              <p>
                No se encontraron observaciones para el producto, la fecha y el rango horario
                seleccionados. Modifique los criterios e intente nuevamente.
              </p>
            </div>
          ) : null}

          {result.visualization === 'time-series' && result.points.length > 0 ? (
            <>
              <div className="data-summary" aria-label="Resumen de los valores">
                {[
                  ['Mínimo', minimum],
                  ['Máximo', maximum],
                  ['Último valor', latest],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>
                      {valueFormatter.format(value as number)}{' '}
                      <small>{result.parameter.unit}</small>
                    </strong>
                  </div>
                ))}
              </div>

              <ScientificDataChart
                caption={
                  result.origin.kind === 'observed'
                    ? `Observaciones de ${result.origin.provider}.`
                    : 'Serie simulada para preparar la futura integración de ROSAC.'
                }
                label={result.product.name}
                points={result.points}
                unit={result.parameter.unit}
              />

              <DataTable
                summary={`Ver valores de la gráfica (${result.points.length})`}
                caption={`Mediciones de ${result.product.name} el ${formatDate(result.query.date)}`}
                columns={['Hora (UTC)', `Valor (${result.parameter.unit})`]}
              >
                {result.points.map((point) => (
                  <tr key={point.timestamp}>
                    <th scope="row">{formatTime(point.timestamp)}</th>
                    <td>{valueFormatter.format(point.value)}</td>
                  </tr>
                ))}
              </DataTable>
            </>
          ) : null}

          {result.visualization === 'image-sequence' && result.images.length > 0 ? (
            <SuviImageSequence images={result.images} />
          ) : null}

          {result.visualization === 'dynamic-spectrum' && result.cells.length > 0 ? (
            <>
              <DynamicSpectrumChart
                label="Espectro dinámico simulado de ROSAC"
                caption="Espectro dinámico de demostración; valores simulados."
                frequencyUnit={result.frequencyUnit}
                cells={result.cells}
                frequencies={result.frequencies}
                timestamps={result.timestamps}
                unit={result.parameter.unit}
              />
              <DataTable
                summary={`Ver valores del espectro (${result.cells.length})`}
                caption="Intensidad simulada por hora y frecuencia"
                columns={['Hora (UTC)', 'Frecuencia (MHz)', 'Intensidad relativa']}
              >
                {result.cells.map((cell) => (
                  <tr key={`${cell.timestamp}-${cell.frequency}`}>
                    <th scope="row">{formatTime(cell.timestamp)}</th>
                    <td>{cell.frequency}</td>
                    <td>{valueFormatter.format(cell.value)}</td>
                  </tr>
                ))}
              </DataTable>
            </>
          ) : null}
        </section>
      ) : null}
    </section>
  )
}
