'use client'

import { ChartNoAxesCombined, Images, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { z } from 'zod'

import { DataTable } from '@/app/components/public/DataTable'
import { Notice } from '@/app/components/public/Notice'
import { Button } from '@/app/components/public/Button'
import { Select } from '@/app/components/public/Select'
import {
  fitSuviQuery,
  getAvailabilityMessage,
  getSuviAvailability,
  getSuviTimeLimits,
  isSuviQuery,
  type SuviAvailability,
} from '@/app/lib/scientific-data-availability'
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
  suviAvailability: SuviAvailability
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
  suviAvailability,
}: ScientificDataExplorerProps) {
  // Server-rendered controls must wait for React's handlers before accepting input.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<ScientificDataResult | null>(initialResult ?? null)
  const [requestState, setRequestState] = useState<RequestState>(initialResult ? 'success' : 'idle')
  const [message, setMessage] = useState<string | null>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState(0)
  const [availability, setAvailability] = useState(suviAvailability)
  useEffect(() => () => activeRequest.current?.abort(), [])
  useEffect(() => {
    const timer = setInterval(() => setAvailability(getSuviAvailability()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const controlsDisabled = !hydrated || requestState === 'loading'

  const selectedSource = sources.find((source) => source.code === query.source)!
  const selected = useMemo(
    () => findScientificProduct(query.source, query.product),
    [query.product, query.source],
  )
  const invalidRange = query.startTime >= query.endTime
  const solarImages = isSuviQuery(query)
  const dateRange = {
    min: solarImages ? availability.start.slice(0, 10) : undefined,
    max: query.source === 'GOES' ? availability.end.slice(0, 10) : undefined,
  }
  const timeLimits = solarImages ? getSuviTimeLimits(query.date, availability) : undefined

  function resetResults() {
    setResult(null)
    setRequestState('idle')
    setMessage(null)
  }

  function updateQuery<Key extends keyof ScientificDataQuery>(
    key: Key,
    value: ScientificDataQuery[Key],
  ) {
    setQuery((current) => {
      const next = { ...current, [key]: value }
      return key === 'date' && isSuviQuery(next) && value ? fitSuviQuery(next, availability) : next
    })
    resetResults()
  }

  function selectSource(sourceCode: ScientificSourceCode) {
    const source = sources.find((candidate) => candidate.code === sourceCode)!
    const requestedDate =
      sourceCode === 'GOES' && query.date > availability.end.slice(0, 10)
        ? availability.end.slice(0, 10)
        : query.date

    setQuery(getDefaultQueryForSource(source, requestedDate))
    resetResults()
  }

  function selectProduct(productCode: ScientificProductCode) {
    const selection = findScientificProduct(query.source, productCode)!
    setQuery((current) => {
      const next = {
        ...current,
        product: productCode,
        parameter: selection.product.parameters[0]!.code,
      }
      return isSuviQuery(next) ? fitSuviQuery(next, availability) : next
    })
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

    const availabilityMessage = getAvailabilityMessage(query, availability)
    if (availabilityMessage) {
      setMessage(availabilityMessage)
      return
    }

    setRequestState('loading')
    setMessage(null)
    setProgress(0)
    const controller = new AbortController()
    activeRequest.current = controller

    try {
      const parameters = new URLSearchParams({
        source: query.source,
        product: query.product,
        parameter: query.parameter,
        date: query.date,
        startTime: query.startTime,
        endTime: query.endTime,
      })
      let response = await fetch(`/api/scientific-data?${parameters.toString()}`, {
        signal: controller.signal,
      })
      const deadline = Date.now() + 30 * 60_000
      while (response.status === 202) {
        const pending = z
          .object({
            state: z.literal('pending'),
            jobId: z.string().min(1),
            progress: z.number().min(0).max(100),
          })
          .parse(await response.json())
        setProgress(pending.progress)
        if (Date.now() > deadline) throw new Error('Historical query timed out')
        await new Promise<void>((resolve) => setTimeout(resolve, 2000))
        controller.signal.throwIfAborted()
        parameters.set('jobId', pending.jobId)
        response = await fetch(`/api/scientific-data?${parameters.toString()}`, {
          signal: controller.signal,
        })
      }
      if (!response.ok) throw new Error('Scientific data request failed')

      const parsed = scientificDataResultSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error('Scientific data response is invalid')
      controller.signal.throwIfAborted()

      setResult(parsed.data)
      setRequestState('success')
      requestAnimationFrame(() => resultsHeading.current?.focus())
    } catch {
      if (controller.signal.aborted) return
      setResult(null)
      setRequestState('error')
      setMessage(
        query.source === 'GOES'
          ? 'No fue posible consultar la fuente GOES en este momento. Inténtelo nuevamente más tarde.'
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
        <span className="data-source-notice-copy">
          <span aria-hidden={query.source !== 'GOES'}>
            Las series GOES se consultan en el archivo histórico de CITIC-UCR. La disponibilidad
            depende del producto y la fecha; la lectura puede tardar varios minutos. Las imágenes
            SUVI se mantienen en NOAA y cubren aproximadamente las últimas 24 horas. EHIS y MPSL
            están pendientes de integración.
          </span>
          <span aria-hidden={query.source !== 'ROSAC'}>
            ROSAC es una previsión de integración. Sus instrumentos y datos reales aún no están
            definidos; todos los resultados de esta fuente son simulados y están rotulados como tal.
          </span>
        </span>
      </Notice>
      {requestState === 'loading' && (
        <div className="data-loading">
          <p className="data-loading-copy" role="status">
            <span>Cargando datos</span>
            <strong>{progress}%</strong>
          </p>
          <progress
            aria-label="Cargando datos"
            className="data-loading-progress"
            max={100}
            value={progress}
          />
          <div className="data-loading-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                activeRequest.current?.abort()
                setRequestState('idle')
                setMessage(null)
              }}
            >
              Cancelar consulta
            </Button>
          </div>
        </div>
      )}

      <form className="data-query-form" data-select-boundary noValidate onSubmit={submitQuery}>
        <div className="data-field">
          <label htmlFor="scientific-source">Fuente de datos</label>
          <Select
            disabled={controlsDisabled}
            id="scientific-source"
            label="Fuente de datos"
            describedBy="scientific-source-hint"
            onChange={(value) => selectSource(value as ScientificSourceCode)}
            value={query.source}
            options={sources.map((source) => ({ value: source.code, label: source.name }))}
          />
          <div className="data-field-details" id="scientific-source-hint">
            <span className="data-field-hint">{selectedSource.description}</span>
          </div>
        </div>

        <div className="data-field">
          <label htmlFor="scientific-product">Producto científico</label>
          <Select
            disabled={controlsDisabled}
            id="scientific-product"
            label="Producto científico"
            describedBy="scientific-product-hint"
            onChange={(value) => selectProduct(value as ScientificProductCode)}
            value={query.product}
            options={selectedSource.instruments.flatMap((instrument) =>
              instrument.products.map((product) => ({
                value: product.code,
                label: `${product.name}${product.name.includes(`(${product.code})`) ? '' : ` (${product.code})`}${product.available ? '' : ' — pendiente'}`,
                disabled: !product.available,
                group: `${instrument.code} — ${instrument.name}`,
              })),
            )}
          />
          <div className="data-field-details" id="scientific-product-hint">
            <span className="data-field-hint">
              Instrumento: {selected?.instrument.code} — {selected?.instrument.name}
            </span>
            {selected?.product.availabilityNote ? (
              <span className="data-field-hint">{selected.product.availabilityNote}</span>
            ) : null}
          </div>
        </div>

        <div className="data-field">
          <label htmlFor="scientific-parameter">Canal o parámetro</label>
          <Select
            disabled={controlsDisabled}
            id="scientific-parameter"
            label="Canal o parámetro"
            onChange={(value) => updateQuery('parameter', value)}
            value={query.parameter}
            options={
              selected?.product.parameters.map((parameter) => ({
                value: parameter.code,
                label: parameter.label,
              })) ?? []
            }
          />
        </div>

        <div className="data-field">
          <label htmlFor="scientific-date">Fecha</label>
          <input
            disabled={controlsDisabled}
            id="scientific-date"
            aria-describedby={query.source === 'GOES' ? 'scientific-date-hint' : undefined}
            max={dateRange.max}
            min={dateRange.min}
            onChange={(event) => updateQuery('date', event.target.value)}
            required
            type="date"
            value={query.date}
          />
          <div className="data-field-details" id="scientific-date-hint">
            {query.source === 'GOES' ? (
              <span className="data-field-hint">
                {solarImages
                  ? `Últimas 24 horas (UTC): del ${availability.start.slice(0, 10)} a las ${availability.start.slice(11, 16)} al ${availability.end.slice(0, 10)} a las ${availability.end.slice(11, 16)}.`
                  : 'Consulta histórica por fecha. Los días sin observaciones se muestran sin datos.'}
              </span>
            ) : null}
          </div>
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
                min={timeLimits?.min}
                max={timeLimits?.max}
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
                min={timeLimits?.min}
                max={timeLimits?.max}
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
