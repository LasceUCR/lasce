'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'

import {
  layoutTimeSeries,
  type TimeSeriesCoordinate,
  type TimeSeriesStyle,
} from '@/app/lib/charts/timeSeriesLayout'
import type { ScientificDataPoint } from '@/app/lib/scientific-data'

import { useElementWidth } from './useElementWidth'

export interface ScientificDataChartProps {
  caption: string
  label: string
  points: ScientificDataPoint[]
  unit: string
  /** Log scale and flare classes; see `timeSeriesStyle`. Linear when omitted. */
  chartStyle?: TimeSeriesStyle
}

const TOOLTIP_WIDTH = 168
const TOOLTIP_HEIGHT = 44

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

/** The index of the coordinate closest to `x` (coordinates are in time order). */
function nearestIndex(coordinates: TimeSeriesCoordinate[], x: number) {
  let low = 0
  let high = coordinates.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (coordinates[middle]!.x < x) low = middle + 1
    else high = middle
  }
  if (low > 0 && x - coordinates[low - 1]!.x < coordinates[low]!.x - x) return low - 1
  return low
}

export function ScientificDataChart({
  caption,
  label,
  points,
  unit,
  chartStyle,
}: ScientificDataChartProps) {
  const t = useTranslations('scientificData.charts')
  const format = useFormatter()
  const titleId = useId()
  const descriptionId = useId()
  const hintId = useId()
  const { ref: viewportRef, width } = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const layout = layoutTimeSeries(points, { ...chartStyle, width })

  function formatValue(value: number) {
    return format.number(value, { maximumSignificantDigits: 4, notation: 'scientific' })
  }

  if (!layout) {
    return (
      <p className="content-empty" role="status">
        {t('empty')}
      </p>
    )
  }
  const {
    coordinates,
    firstTimestamp,
    flareBands,
    frame,
    gridLines,
    lastTimestamp,
    maximum,
    minimum,
    path,
    peak,
    peakClass,
    plotHeight,
    pointRadius,
    scale,
    timeTicks,
  } = layout
  const plotBottom = frame.top + plotHeight
  const activePoint = active === null ? null : (coordinates[active] ?? null)
  const readout = activePoint
    ? t('tooltip', {
        time: formatTime(activePoint.timestamp),
        value: formatValue(activePoint.value),
        unit,
      })
    : ''

  function selectAt(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    if (!box.width) return
    const x = ((event.clientX - box.left) / box.width) * frame.width
    setActive(nearestIndex(coordinates, x))
  }

  function moveWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    const last = coordinates.length - 1
    const current = active ?? coordinates.indexOf(peak)
    const next = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, last),
      Home: 0,
      End: last,
    }[event.key]
    if (next !== undefined) {
      event.preventDefault()
      setActive(next)
    } else if (event.key === 'Escape') {
      setActive(null)
    }
  }

  const tooltipX = activePoint
    ? Math.min(
        Math.max(activePoint.x - TOOLTIP_WIDTH / 2, frame.left),
        frame.width - frame.right - TOOLTIP_WIDTH,
      )
    : 0
  const tooltipY = activePoint
    ? activePoint.y - TOOLTIP_HEIGHT - 12 < frame.top
      ? activePoint.y + 12
      : activePoint.y - TOOLTIP_HEIGHT - 12
    : 0

  const notes = [
    scale === 'log' ? t('logScale') : null,
    flareBands.length ? t('flareClasses') : null,
  ].filter(Boolean)

  return (
    <figure className="data-chart-figure">
      <div
        className="data-chart-viewport"
        ref={viewportRef}
        role="region"
        aria-label={t('areaLabel', { label })}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={moveWithKeys}
        onFocus={() => setActive((current) => current ?? coordinates.indexOf(peak))}
        onBlur={() => setActive(null)}
      >
        <svg
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="data-chart"
          role="img"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          onPointerMove={selectAt}
          onPointerDown={selectAt}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActive(null)
          }}
        >
          <title id={titleId}>{t('title', { label })}</title>
          <desc id={descriptionId}>
            {t('description', {
              count: coordinates.length,
              start: formatTime(firstTimestamp),
              end: formatTime(lastTimestamp),
              minimum: formatValue(minimum),
              maximum: formatValue(maximum),
              unit,
            })}
            {peakClass ? ` ${t('peakClass', { flareClass: peakClass.label })}` : null}
          </desc>

          {gridLines.map(({ y, value }) => (
            <g aria-hidden="true" key={value}>
              <line
                className="data-chart-grid"
                x1={frame.left}
                x2={frame.width - frame.right}
                y1={y}
                y2={y}
              />
              <text className="data-chart-axis-text" textAnchor="end" x={frame.left - 12} y={y + 4}>
                {formatValue(value)}
              </text>
            </g>
          ))}

          {flareBands.map(({ letter, y }) => (
            <text
              aria-hidden="true"
              className="data-chart-flare-class"
              key={letter}
              textAnchor="middle"
              x={frame.width - frame.right / 2}
              y={y + 5}
            >
              {letter}
            </text>
          ))}

          <line
            aria-hidden="true"
            className="data-chart-axis"
            x1={frame.left}
            x2={frame.left}
            y1={frame.top}
            y2={plotBottom}
          />
          <line
            aria-hidden="true"
            className="data-chart-axis"
            x1={frame.left}
            x2={frame.width - frame.right}
            y1={plotBottom}
            y2={plotBottom}
          />

          <polyline aria-hidden="true" className="data-chart-line" points={path} />
          {coordinates.map(({ timestamp, x, y }) => (
            <circle
              aria-hidden="true"
              className="data-chart-point"
              cx={x}
              cy={y}
              key={timestamp}
              r={pointRadius}
            />
          ))}

          {peakClass ? (
            <text
              aria-hidden="true"
              className="data-chart-peak-label"
              textAnchor={peak.x > frame.width - frame.right - 40 ? 'end' : 'middle'}
              x={peak.x}
              y={Math.max(peak.y - 10, frame.top - 8)}
            >
              {peakClass.label}
            </text>
          ) : null}

          <g aria-hidden="true" className="data-chart-axis-text">
            {timeTicks.map(({ anchor, timestamp, x }, index) => (
              <text key={timestamp} textAnchor={anchor} x={x} y={frame.height - 20}>
                {formatTime(timestamp)}
                {index === timeTicks.length - 1 ? ' UTC' : null}
              </text>
            ))}
          </g>

          {activePoint ? (
            <g aria-hidden="true" className="data-chart-tooltip">
              <line
                className="data-chart-tooltip-guide"
                x1={activePoint.x}
                x2={activePoint.x}
                y1={frame.top}
                y2={plotBottom}
              />
              <circle
                className="data-chart-tooltip-point"
                cx={activePoint.x}
                cy={activePoint.y}
                r={5}
              />
              <rect
                className="data-chart-tooltip-box"
                height={TOOLTIP_HEIGHT}
                rx={6}
                width={TOOLTIP_WIDTH}
                x={tooltipX}
                y={tooltipY}
              />
              <text className="data-chart-tooltip-text" x={tooltipX + 10} y={tooltipY + 18}>
                {formatTime(activePoint.timestamp)} UTC
              </text>
              <text className="data-chart-tooltip-value" x={tooltipX + 10} y={tooltipY + 35}>
                {formatValue(activePoint.value)} {unit}
              </text>
            </g>
          ) : null}
        </svg>
        <p className="sr-only" id={hintId}>
          {t('keyboardHint')}
        </p>
        <p aria-live="polite" className="sr-only">
          {readout}
        </p>
      </div>
      <figcaption>
        {t('caption', { caption, unit })}
        {notes.length ? ` ${notes.join(' ')}` : null}
      </figcaption>
    </figure>
  )
}
