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
  getLatestAvailableDate,
  type GoesAvailability,
} from '@/app/lib/scientific-data-availability'
import { crossesMidnight, getLocalRange, type LocalTime } from '@/app/lib/scientific-data-time'
import {
  findScientificProduct,
  getDefaultQueryForSource,
  getScientificDataQuerySchema,
  scientificDataResultSchema,
  summarizeTimeSeries,
  type ScientificDataQuery,
  type ScientificDataResult,
  type ScientificProductCode,
  type ScientificSource,
  type ScientificSourceCode,
} from '@/app/lib/scientific-data'
import { timeSeriesStyle } from '@/app/lib/charts/timeSeriesLayout'
import { flareClass } from '@/app/lib/charts/flareClass'
import { describeOrigin, localizeResultNames } from '@/app/lib/scientific-data-copy'
import { withQueryReturn } from '@/app/lib/scientific-data-navigation'

import { DynamicSpectrumChart } from './DynamicSpectrumChart'
import { InstrumentProductSelect } from './InstrumentProductSelect'
import { ResourceDownloadActions, type ResourceDownloadMessage } from './ResourceDownloadActions'
import { ScientificDataChart } from './ScientificDataChart'
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'

import { ScientificResultsSkeleton } from './ScientificResultsSkeleton'
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
  /** Runs `initialQuery` on mount, as when a visitor returns from signing in to download it. */
  consultOnLoad?: boolean
  goesAvailability: GoesAvailability
  /** Whether a session exists. Decides between disabled buttons and a sign-in link. */
  signedIn?: boolean
  /** The signed-in user's grants; only used to draw the download buttons, never to enforce. */
  downloadGrants?: readonly Permission[]
  /** Where an anonymous visitor goes when choosing a download; its `next` gets the query. */
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
  consultOnLoad = false,
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
  const tOrigins = useTranslations('scientificData.origins')
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
        sameStartEnd: tValidation('sameStartEnd'),
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

  /** What is wrong with the criteria: a problem with the times is shown beside the time fields. */
  function getValidationIssues(validatedQuery: ScientificDataQuery) {
    const parsed = querySchema.safeParse(validatedQuery)
    if (parsed.success) return null

    const isTimeIssue = (issue: (typeof parsed.error.issues)[number]) =>
      issue.path[0] === 'startTime' || issue.path[0] === 'endTime'
    const time = parsed.error.issues.find(isTimeIssue)?.message ?? null
    const other = parsed.error.issues.find((issue) => !isTimeIssue(issue))?.message ?? null
    return { time, other: time || other ? other : tValidation('default') }
  }

  /** A local time as text, naming the day when it is not the query's own UTC day. */
  function formatLocalTime({ time, dayOffset }: LocalTime) {
    if (dayOffset < 0) return t('localDayBefore', { time })
    if (dayOffset > 0) return t('localDayAfter', { time })
    return time
  }

  // Server-rendered controls must wait for React's handlers before accepting input.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [query, setQuery] = useState(initialQuery)
  const [rawResult, setResult] = useState<ScientificDataResult | null>(initialResult ?? null)
  // The server names a result in Spanish; show it with the visitor's catalogue instead.
  const result = useMemo(
    () => (rawResult ? localizeResultNames(rawResult, sources) : null),
    [rawResult, sources],
  )
  const origin = result
    ? describeOrigin(result.origin, (key, values) => tOrigins(key as never, values as never))
    : null
  const [requestState, setRequestState] = useState<RequestState>(initialResult ? 'success' : 'idle')
  const [hasConsulted, setHasConsulted] = useState(Boolean(initialResult))
  const [message, setMessage] = useState<string | null>(null)
  /** A problem with the start or end time, shown next to the time fields. */
  const [timeError, setTimeError] = useState<string | null>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const pendingResultsFocus = useRef(false)
  const activeRequest = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState(0)
  /** The asynchronous job that produced `result`, so a download can reuse it instead of re-queuing. */
  const [resultJobId, setResultJobId] = useState<string | null>(null)
  const [pendingDownload, setPendingDownload] = useState<DownloadFormat | null>(null)
  const [downloadMessage, setDownloadMessage] = useState<ResourceDownloadMessage | null>(null)
  useEffect(() => () => activeRequest.current?.abort(), [])

  // Bring the results into view, which on a phone is what shows that the query ran, and move
  // focus to their heading. This waits for the commit that renders the heading and lifts the
  // loading region's inert state: a frame callback scheduled from the request can run before it.
  // Motion is skipped for visitors who ask for less of it.
  useEffect(() => {
    if (requestState !== 'success' || !result || !pendingResultsFocus.current) return
    const heading = resultsHeading.current
    if (!heading) return
    pendingResultsFocus.current = false
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    heading.focus({ preventScroll: true })
    heading.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [requestState, result])
  const controlsDisabled = !hydrated

  const selectedSource = sources.find((source) => source.code === query.source)!
  const selected = useMemo(
    () => findScientificProduct(query.source, query.product, sources),
    [query.product, query.source],
  )
  const rangeCrossesMidnight = crossesMidnight(query)
  const timeDescribedBy = timeError
    ? 'scientific-time-hint scientific-time-error'
    : 'scientific-time-hint'
  const solarImages =
    query.source === 'GOES' && selected?.product.visualization === 'image-sequence'
  // The latest day that already has data for this instrument; later days cannot be picked.
  const maxDate =
    query.source === 'GOES' && selected
      ? getLatestAvailableDate(selected.instrument.code, goesAvailability)
      : undefined
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
    setTimeError(null)
    setResultJobId(null)
    setDownloadMessage(null)
  }

  /** `date`, or the latest day with data for the instrument of `productCode` when it is later. */
  function clampDate(
    sourceCode: ScientificSourceCode,
    productCode: ScientificProductCode,
    date: string,
  ) {
    if (sourceCode !== 'GOES') return date
    const instrument = findScientificProduct(sourceCode, productCode, sources)?.instrument.code
    if (!instrument) return date
    const latest = getLatestAvailableDate(instrument, goesAvailability)
    return date > latest ? latest : date
  }

  async function downloadResult(format: DownloadFormat) {
    if (!result || !requestDownload) return
    if (!signedIn) {
      navigate(withQueryReturn(loginHref, result.query))
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
        navigate(withQueryReturn(loginHref, result.query))
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
    const next = getDefaultQueryForSource(source, query.date)

    setQuery({ ...next, date: clampDate(next.source, next.product, next.date) })
    resetResults()
  }

  function selectProduct(productCode: ScientificProductCode) {
    const selection = findScientificProduct(query.source, productCode, sources)!
    setQuery({
      ...query,
      product: productCode,
      parameter: selection.product.parameters[0]!.code,
      date: clampDate(query.source, productCode, query.date),
    })
    resetResults()
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const issues = getValidationIssues(query)
    if (issues) {
      setRequestState('idle')
      setTimeError(issues.time)
      setMessage(issues.other)
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
    if (maxDate && query.date > maxDate) {
      setMessage(tErrors('dateNotPublished', { date: formatDate(maxDate) }))
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
      setTimeError(null)
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
        if (focusResults) pendingResultsFocus.current = true
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

  // From every reading in the window when the source provides it, not just the points drawn.
  const summary = result?.visualization === 'time-series' ? summarizeTimeSeries(result) : null
  const chartStyle =
    result?.visualization === 'time-series'
      ? timeSeriesStyle(result.product.code, result.parameter.code)
      : null
  // The class of the real maximum, from every reading, not only the points drawn.
  const peakClass = chartStyle?.flareClasses && summary ? flareClass(summary.maximum) : null

  useEffect(() => {
    if (consultOnLoad) void requestData(initialQuery, true)
  }, [consultOnLoad, initialQuery, requestData])

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
              <>
                <span className="data-field-hint">{t('dateHint')}</span>
                {maxDate ? (
                  <span className="data-field-hint">
                    {t('dateLatestHint', { date: formatDate(maxDate) })}
                  </span>
                ) : null}
              </>
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
              aria-describedby={timeDescribedBy}
              aria-invalid={timeError ? true : undefined}
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
              aria-describedby={timeDescribedBy}
              aria-invalid={timeError ? true : undefined}
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

        <div className="data-time-notes">
          <p className="data-field-hint" id="scientific-time-hint">
            {t('timeZoneHint')}
            {rangeCrossesMidnight ? <> {t('crossesMidnightHint')}</> : null}
          </p>
          {timeError ? (
            <p className="form-field-error" id="scientific-time-error" role="alert">
              {timeError}
            </p>
          ) : null}
        </div>
      </form>

      {message ? (
        <Notice id="scientific-query-message" tone="error" role="alert">
          {message}
        </Notice>
      ) : null}

      {/* While a query runs, the results card is drawn as placeholders shaped like the product
          asked for, in the same place; the progress bar above already announces the load. */}
      {requestState === 'loading' || (requestState === 'success' && result) ? (
        <LoadingRegion
          announce={false}
          id="scientific-results"
          loading={requestState === 'loading'}
          skeleton={
            <ScientificResultsSkeleton
              visualization={selected?.product.visualization ?? 'time-series'}
            />
          }
        >
          {result ? (
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
                    {crossesMidnight(result.query) ? <> {t('crossesMidnightResult')}</> : null}
                  </dd>
                </div>
                <div>
                  <dt>{t('localIntervalResultLabel')}</dt>
                  <dd>
                    {formatLocalTime(getLocalRange(result.query).start)}–
                    {formatLocalTime(getLocalRange(result.query).end)}
                  </dd>
                </div>
                <div>
                  <dt>{t('sourceResultLabel')}</dt>
                  <dd>{origin?.provider}</dd>
                </div>
                {result.origin.satellite ? (
                  <div>
                    <dt>{t('satelliteResultLabel')}</dt>
                    <dd>{t('satelliteValue', { number: result.origin.satellite })}</dd>
                  </div>
                ) : null}
              </dl>

              <Notice tone="info">{origin?.notice}</Notice>

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

              {result.visualization === 'time-series' && result.points.length > 0 && summary ? (
                <>
                  <div className="data-summary" aria-label={t('summaryLabel')}>
                    {(
                      [
                        [t('minimum'), summary.minimum, null],
                        [
                          t('maximum'),
                          summary.maximum,
                          peakClass ? t('flareClass', { flareClass: peakClass.label }) : null,
                        ],
                        [t('latest'), summary.latest, null],
                      ] as const
                    ).map(([label, value, note]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>
                          {formatValue(value)} <small>{result.parameter.unit}</small>
                        </strong>
                        {note ? <span className="data-summary-note">{note}</span> : null}
                      </div>
                    ))}
                  </div>

                  <ScientificDataChart
                    caption={
                      result.origin.kind === 'observed'
                        ? t('chartCaptionObserved', { provider: origin?.provider ?? '' })
                        : t('chartCaptionSimulated')
                    }
                    label={result.product.name}
                    points={result.points}
                    unit={result.parameter.unit}
                    chartStyle={chartStyle ?? undefined}
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
                <SuviImageSequence
                  images={result.images}
                  productName={result.product.name}
                  satellite={result.origin.satellite}
                />
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
        </LoadingRegion>
      ) : null}
    </section>
  )
}
