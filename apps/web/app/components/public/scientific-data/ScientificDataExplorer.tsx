'use client'

import { ChartNoAxesCombined, Images, Search } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import { z } from 'zod'

import type { RequestResourceDownloadResult } from '@/app/(public)/datos/actions'
import { DataTable } from '@/app/components/public/DataTable'
import { Notice } from '@/app/components/public/Notice'
import { Button } from '@/app/components/public/Button'
import { Select } from '@/app/components/public/Select'
import type { Permission } from '@/app/lib/auth/permissions'
import type { DownloadFormat } from '@/app/lib/downloads/formats'
import { getDownloadOptions } from '@/app/lib/downloads/policy'
import {
  getAvailabilityMessage,
  type GoesAvailability,
} from '@/app/lib/scientific-data-availability'
import {
  findScientificProduct,
  getDefaultQueryForSource,
  getScientificDataQuerySchema,
  scientificDataResultSchema,
  type ScientificDataQuery,
  type ScientificDataResult,
  type ScientificProductCode,
  type ScientificSource,
  type ScientificSourceCode,
} from '@/app/lib/scientific-data'

import { DynamicSpectrumChart } from './DynamicSpectrumChart'
import { InstrumentProductSelect } from './InstrumentProductSelect'
import { ResourceDownloadActions, type ResourceDownloadMessage } from './ResourceDownloadActions'
import { ScientificDataChart } from './ScientificDataChart'
import { SuviImageSequence } from './SuviImageSequence'

export interface ResourceDownloadRequestInput {
  query: ScientificDataQuery
  format: DownloadFormat
  jobId?: string
}

export interface ScientificDataExplorerProps {
  sources: ScientificSource[]
  initialQuery: ScientificDataQuery
  initialResult?: ScientificDataResult
  goesAvailability: GoesAvailability
  /** Whether a session exists. Decides between disabled buttons and a sign-in link. */
  signedIn?: boolean
  /** The signed-in user's grants; only used to draw the download buttons, never to enforce. */
  downloadGrants?: readonly Permission[]
  /** Where an anonymous visitor goes when choosing a download. */
  loginHref?: string
  /** The `requestResourceDownload` Server Action. Without it no download buttons are shown. */
  requestDownload?: (
    request: ResourceDownloadRequestInput,
  ) => Promise<RequestResourceDownloadResult>
  /** Opens a download link or the sign-in page. Defaults to a full page load. */
  navigate?: (url: string) => void
}

function assignLocation(url: string) {
  window.location.assign(url)
}

type RequestState = 'idle' | 'loading' | 'success' | 'error'

const subscribeToHydration = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

export function ScientificDataExplorer({
  sources,
  initialQuery,
  initialResult,
  goesAvailability,
  signedIn = false,
  downloadGrants = [],
  loginHref = '/acceso',
  requestDownload,
  navigate = assignLocation,
}: ScientificDataExplorerProps) {
  const t = useTranslations('scientificData.explorer')
  const tBanners = useTranslations('scientificData.banners')
  const tLoading = useTranslations('scientificData.loading')
  const tValidation = useTranslations('scientificData.validation')
  const tErrors = useTranslations('scientificData.errors')
  const format = useFormatter()
  const querySchema = useMemo(
    () =>
      getScientificDataQuerySchema({
        invalidSource: tValidation('invalidSource'),
        invalidProduct: tValidation('invalidProduct'),
        invalidParameter: tValidation('invalidParameter'),
        invalidDate: tValidation('invalidDate'),
        invalidStartTime: tValidation('invalidStartTime'),
        invalidEndTime: tValidation('invalidEndTime'),
        startBeforeEnd: tValidation('startBeforeEnd'),
        productUnavailable: tValidation('productUnavailable'),
        invalidParameterForProduct: tValidation('invalidParameterForProduct'),
      }),
    [tValidation],
  )

  function formatDate(date: string) {
    return format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' })
  }

  function formatValue(value: number) {
    return format.number(value, { maximumSignificantDigits: 5, notation: 'scientific' })
  }

  function getValidationMessage(validatedQuery: ScientificDataQuery) {
    const parsed = querySchema.safeParse(validatedQuery)
    return parsed.success ? null : (parsed.error.issues[0]?.message ?? tValidation('default'))
  }

  // Server-rendered controls must wait for React's handlers before accepting input.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<ScientificDataResult | null>(initialResult ?? null)
  const [requestState, setRequestState] = useState<RequestState>(initialResult ? 'success' : 'idle')
  const [hasConsulted, setHasConsulted] = useState(Boolean(initialResult))
  const [message, setMessage] = useState<string | null>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState(0)
  /** The asynchronous job that produced `result`, so a download can reuse it instead of re-queuing. */
  const [resultJobId, setResultJobId] = useState<string | null>(null)
  const [pendingDownload, setPendingDownload] = useState<DownloadFormat | null>(null)
  const [downloadMessage, setDownloadMessage] = useState<ResourceDownloadMessage | null>(null)
  useEffect(() => () => activeRequest.current?.abort(), [])
  const controlsDisabled = !hydrated

  const selectedSource = sources.find((source) => source.code === query.source)!
  const selected = useMemo(
    () => findScientificProduct(query.source, query.product),
    [query.product, query.source],
  )
  const invalidRange = query.startTime >= query.endTime
  const solarImages =
    query.source === 'GOES' && selected?.product.visualization === 'image-sequence'
  const maxDate = query.source === 'GOES' ? goesAvailability.today : undefined
  const downloadOptions = getDownloadOptions(
    query,
    signedIn ? downloadGrants : ['download_resources'],
  )
  const canDownload = downloadOptions.some((option) => option.allowed)
  const canDownloadData = downloadOptions.some(
    (option) => option.format === 'csv' && option.allowed,
  )
  const downloadNotice =
    downloadOptions.length === 0
      ? 'noDownloads'
      : !canDownload
        ? 'denied'
        : query.source === 'ROSAC'
          ? 'rosacDownloads'
          : canDownloadData
            ? 'goesDataDownloads'
            : 'goesChartOnly'
  const bannerValues = { source: query.source, instrument: selected?.instrument.code ?? '' }
  const loadingLabel = tLoading(solarImages ? 'images' : 'data')
  const loadingProgress = !solarImages && progress > 0 ? progress : undefined

  function resetResults() {
    activeRequest.current?.abort()
    setResult(null)
    setRequestState('idle')
    setMessage(null)
    setResultJobId(null)
    setDownloadMessage(null)
  }

  async function downloadResult(format: DownloadFormat) {
    if (!result || !requestDownload) return
    if (!signedIn) {
      navigate(loginHref)
      return
    }

    setPendingDownload(format)
    setDownloadMessage(null)
    try {
      const outcome = await requestDownload({
        query: result.query,
        format,
        ...(resultJobId ? { jobId: resultJobId } : {}),
      })
      if (outcome.ok) {
        setDownloadMessage({
          tone: 'info',
          text: t('downloadStarted', { filename: outcome.filename }),
        })
        navigate(outcome.url)
      } else if (outcome.reason === 'unauthenticated') {
        navigate(loginHref)
      } else {
        setDownloadMessage({ tone: 'error', text: outcome.message })
      }
    } catch {
      setDownloadMessage({
        tone: 'error',
        text: tErrors('downloadFailed'),
      })
    } finally {
      setPendingDownload(null)
    }
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
      sourceCode === 'GOES' && query.date > goesAvailability.today
        ? goesAvailability.today
        : query.date

    setQuery(getDefaultQueryForSource(source, requestedDate))
    resetResults()
  }

  function selectProduct(productCode: ScientificProductCode) {
    const selection = findScientificProduct(query.source, productCode)!
    setQuery({
      ...query,
      product: productCode,
      parameter: selection.product.parameters[0]!.code,
    })
    resetResults()
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationMessage = getValidationMessage(query)
    if (validationMessage) {
      setRequestState('idle')
      setMessage(validationMessage)
      return
    }

    const availabilityMessage = getAvailabilityMessage(
      query,
      goesAvailability,
      tErrors('dateNotFuture'),
    )
    if (availabilityMessage) {
      setMessage(availabilityMessage)
      return
    }

    void requestData(query, true)
  }

  const requestData = useCallback(
    async (requestedQuery: ScientificDataQuery, focusResults = false) => {
      activeRequest.current?.abort()
      setResult(null)
      setRequestState('loading')
      setHasConsulted(true)
      setMessage(null)
      setProgress(0)
      setResultJobId(null)
      setDownloadMessage(null)
      let jobId: string | null = null
      const controller = new AbortController()
      activeRequest.current = controller

      try {
        const parameters = new URLSearchParams({
          source: requestedQuery.source,
          product: requestedQuery.product,
          parameter: requestedQuery.parameter,
          date: requestedQuery.date,
          startTime: requestedQuery.startTime,
          endTime: requestedQuery.endTime,
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
          controller.signal.throwIfAborted()
          setProgress(pending.progress)
          if (Date.now() > deadline) throw new Error('Historical query timed out')
          await new Promise<void>((resolve) => setTimeout(resolve, 2000))
          controller.signal.throwIfAborted()
          jobId = pending.jobId
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
        setResultJobId(jobId)
        setRequestState('success')
        if (focusResults) {
          requestAnimationFrame(() => {
            if (!controller.signal.aborted) resultsHeading.current?.focus()
          })
        }
      } catch {
        if (controller.signal.aborted) return
        setResult(null)
        setRequestState('error')
        setMessage(
          requestedQuery.source === 'GOES'
            ? tErrors('requestFailedGoes')
            : tErrors('requestFailedOther'),
        )
      }
    },
    [tErrors],
  )

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
          <p className="topic-kicker">{t('kicker')}</p>
          <h2 id="scientific-query-title" tabIndex={-1}>
            {t('title')}
          </h2>
        </div>
        <span className="topic-badge">
          {selectedSource.dataKind === 'observed' ? t('badgeObserved') : t('badgeSimulated')}
        </span>
      </div>

      {hasConsulted && (
        <>
          <Notice tone="info">
            {tBanners(
              query.source === 'GOES' ? 'goesConsultation' : 'rosacConsultation',
              bannerValues,
            )}
            {selected?.instrument.code === 'SEISS' && <> {tBanners('pendingProducts')}</>}
          </Notice>
          <aside aria-labelledby="scientific-permissions-title" className="data-permissions">
            <h3 id="scientific-permissions-title">{tBanners('title')}</h3>
            <p>
              {tBanners(downloadNotice, bannerValues)}
              {canDownload && (
                <>
                  {!signedIn && <> {tBanners('signIn')}</>} {tBanners('expiry')}
                </>
              )}
            </p>
          </aside>
        </>
      )}

      {requestState === 'loading' && (
        <div className="data-loading">
          <div className="data-loading-header">
            <p className="data-loading-copy" role="status">
              <span>{loadingLabel}</span>
              {loadingProgress !== undefined && <strong>{loadingProgress}%</strong>}
            </p>
            <button className="data-loading-cancel" type="button" onClick={resetResults}>
              {tLoading('cancel')}
            </button>
          </div>
          <progress
            aria-label={loadingLabel}
            className="data-loading-progress"
            max={100}
            value={loadingProgress}
          />
        </div>
      )}

      <form className="data-query-form" data-select-boundary noValidate onSubmit={submitQuery}>
        <div className="data-field data-source-field">
          <label htmlFor="scientific-source">{t('sourceLabel')}</label>
          <Select
            disabled={controlsDisabled}
            id="scientific-source"
            label={t('sourceLabel')}
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
          <label htmlFor="scientific-product">{t('productLabel')}</label>
          <InstrumentProductSelect
            disabled={controlsDisabled}
            id="scientific-product"
            label={t('productLabel')}
            describedBy="scientific-product-hint"
            onChange={(value) => selectProduct(value as ScientificProductCode)}
            value={query.product}
            options={selectedSource.instruments.flatMap((instrument) =>
              instrument.products.map((product) => ({
                value: product.code,
                label: `${product.name}${product.name.includes(`(${product.code})`) ? '' : ` (${product.code})`}${product.available ? '' : t('pendingSuffix')}`,
                group: `${instrument.code} — ${instrument.name}`,
                disabled: !product.available,
              })),
            )}
          />
          <div className="data-field-details" id="scientific-product-hint">
            {selected?.product.availabilityNote ? (
              <span className="data-field-hint">{selected.product.availabilityNote}</span>
            ) : null}
          </div>
        </div>

        {!solarImages ? (
          <div className="data-field">
            <label htmlFor="scientific-parameter">{t('parameterLabel')}</label>
            <Select
              disabled={controlsDisabled}
              id="scientific-parameter"
              label={t('parameterLabel')}
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
        ) : null}

        <div className="data-field">
          <label htmlFor="scientific-date">{t('dateLabel')}</label>
          <input
            disabled={controlsDisabled}
            id="scientific-date"
            aria-describedby={query.source === 'GOES' ? 'scientific-date-hint' : undefined}
            max={maxDate}
            onChange={(event) => updateQuery('date', event.target.value)}
            required
            type="date"
            value={query.date}
          />
          <div className="data-field-details" id="scientific-date-hint">
            {query.source === 'GOES' ? (
              <span className="data-field-hint">{t('dateHint')}</span>
            ) : null}
          </div>
        </div>

        <div
          className="data-time-range data-time-fields"
          role="group"
          aria-label={t('timeRangeGroupLabel')}
        >
          <div className="data-field">
            <label htmlFor="scientific-start-time">{t('startTimeLabel')}</label>
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
            <label htmlFor="scientific-end-time">{t('endTimeLabel')}</label>
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

        <div className="data-query-submit">
          <Button
            disabled={controlsDisabled || requestState === 'loading'}
            icon={<Search aria-hidden="true" size={18} strokeWidth={1.8} />}
            type="submit"
          >
            {requestState === 'loading' ? t('submitLoading') : t('submit')}
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
              <p className="topic-kicker">{t('resultsKicker')}</p>
              <h2 id="scientific-results-title" ref={resultsHeading} tabIndex={-1}>
                {result.product.name}
                {result.product.name.includes(`(${result.product.code})`)
                  ? ''
                  : ` (${result.product.code})`}
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
              <dt>{t('instrumentResultLabel')}</dt>
              <dd>{result.instrument.code}</dd>
            </div>
            <div>
              <dt>
                {result.visualization === 'image-sequence'
                  ? t('wavelengthResultLabel')
                  : t('channelResultLabel')}
              </dt>
              <dd>
                {result.visualization === 'image-sequence'
                  ? selected?.product.wavelength
                  : result.parameter.label}
              </dd>
            </div>
            <div>
              <dt>{t('dateResultLabel')}</dt>
              <dd>{formatDate(result.query.date)}</dd>
            </div>
            <div>
              <dt>{t('intervalResultLabel')}</dt>
              <dd>
                {result.query.startTime}–{result.query.endTime} UTC
              </dd>
            </div>
            <div>
              <dt>{t('sourceResultLabel')}</dt>
              <dd>{result.origin.provider}</dd>
            </div>
            {result.origin.satellite ? (
              <div>
                <dt>{t('satelliteResultLabel')}</dt>
                <dd>{t('satelliteValue', { number: result.origin.satellite })}</dd>
              </div>
            ) : null}
          </dl>

          <Notice tone="info">{result.origin.notice}</Notice>

          {!hasResults ? (
            <div className="content-empty" role="status">
              <h3>{t('emptyTitle')}</h3>
              <p>
                {result.visualization === 'image-sequence'
                  ? t('emptyImageMessage')
                  : t('emptyDataMessage')}
              </p>
            </div>
          ) : null}

          {result.visualization === 'time-series' && result.points.length > 0 ? (
            <>
              <div className="data-summary" aria-label={t('summaryLabel')}>
                {[
                  [t('minimum'), minimum],
                  [t('maximum'), maximum],
                  [t('latest'), latest],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>
                      {formatValue(value as number)} <small>{result.parameter.unit}</small>
                    </strong>
                  </div>
                ))}
              </div>

              <ScientificDataChart
                caption={
                  result.origin.kind === 'observed'
                    ? t('chartCaptionObserved', { provider: result.origin.provider })
                    : t('chartCaptionSimulated')
                }
                label={result.product.name}
                points={result.points}
                unit={result.parameter.unit}
              />

              <DataTable
                summary={t('tableToggle', { count: result.points.length })}
                caption={t('tableCaption', {
                  product: result.product.name,
                  date: formatDate(result.query.date),
                })}
                columns={[t('columnTime'), t('columnValue', { unit: result.parameter.unit })]}
              >
                {result.points.map((point) => (
                  <tr key={point.timestamp}>
                    <th scope="row">{formatTime(point.timestamp)}</th>
                    <td>{formatValue(point.value)}</td>
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
                label={t('dynamicSpectrumLabel')}
                caption={t('dynamicSpectrumCaption')}
                frequencyUnit={result.frequencyUnit}
                cells={result.cells}
                frequencies={result.frequencies}
                timestamps={result.timestamps}
                unit={result.parameter.unit}
              />
              <DataTable
                summary={t('dynamicSpectrumTableToggle', { count: result.cells.length })}
                caption={t('dynamicSpectrumTableCaption')}
                columns={[t('columnTime'), t('columnFrequency'), t('columnIntensity')]}
              >
                {result.cells.map((cell) => (
                  <tr key={`${cell.timestamp}-${cell.frequency}`}>
                    <th scope="row">{formatTime(cell.timestamp)}</th>
                    <td>{cell.frequency}</td>
                    <td>{formatValue(cell.value)}</td>
                  </tr>
                ))}
              </DataTable>
            </>
          ) : null}

          {requestDownload && hasResults ? (
            <ResourceDownloadActions
              message={downloadMessage}
              onDownload={(format) => void downloadResult(format)}
              options={getDownloadOptions(result.query, downloadGrants)}
              pendingFormat={pendingDownload}
              signedIn={signedIn}
            />
          ) : null}
        </section>
      ) : null}
    </section>
  )
}
