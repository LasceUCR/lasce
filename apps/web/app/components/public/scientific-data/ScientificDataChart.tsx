'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useId } from 'react'

import { layoutTimeSeries, TIME_SERIES_CHART as chart } from '@/app/lib/charts/timeSeriesLayout'
import type { ScientificDataPoint } from '@/app/lib/scientific-data'

export interface ScientificDataChartProps {
  caption: string
  label: string
  points: ScientificDataPoint[]
  unit: string
}

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

export function ScientificDataChart({ caption, label, points, unit }: ScientificDataChartProps) {
  const t = useTranslations('scientificData.charts')
  const format = useFormatter()
  const titleId = useId()
  const descriptionId = useId()
  const layout = layoutTimeSeries(points)

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
    gridLines,
    lastTimestamp,
    maximum,
    middleTimestamp,
    minimum,
    path,
    plotWidth,
    pointRadius,
  } = layout

  return (
    <figure className="data-chart-figure">
      <div
        className="data-chart-viewport"
        role="region"
        aria-label={t('areaLabel', { label })}
        tabIndex={0}
      >
        <svg
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="data-chart"
          role="img"
          viewBox={`0 0 ${chart.width} ${chart.height}`}
        >
          <title id={titleId}>{t('title', { label })}</title>
          <desc id={descriptionId}>
            {t('description', {
              count: points.length,
              start: formatTime(firstTimestamp),
              end: formatTime(lastTimestamp),
              minimum: formatValue(minimum),
              maximum: formatValue(maximum),
              unit,
            })}
          </desc>

          {gridLines.map(({ ratio, y, value }) => (
            <g aria-hidden="true" key={ratio}>
              <line
                className="data-chart-grid"
                x1={chart.left}
                x2={chart.width - chart.right}
                y1={y}
                y2={y}
              />
              <text className="data-chart-axis-text" textAnchor="end" x={chart.left - 12} y={y + 4}>
                {formatValue(value)}
              </text>
            </g>
          ))}

          <line
            aria-hidden="true"
            className="data-chart-axis"
            x1={chart.left}
            x2={chart.left}
            y1={chart.top}
            y2={chart.height - chart.bottom}
          />
          <line
            aria-hidden="true"
            className="data-chart-axis"
            x1={chart.left}
            x2={chart.width - chart.right}
            y1={chart.height - chart.bottom}
            y2={chart.height - chart.bottom}
          />

          <polyline aria-hidden="true" className="data-chart-line" points={path} />
          {coordinates.map(({ timestamp, value, x, y }) => (
            <circle
              aria-hidden="true"
              className="data-chart-point"
              cx={x}
              cy={y}
              key={timestamp}
              r={pointRadius}
            >
              <title>
                {formatTime(timestamp)} UTC: {formatValue(value)} {unit}
              </title>
            </circle>
          ))}

          <g aria-hidden="true" className="data-chart-axis-text">
            <text textAnchor="start" x={chart.left} y={chart.height - 20}>
              {formatTime(firstTimestamp)}
            </text>
            <text textAnchor="middle" x={chart.left + plotWidth / 2} y={chart.height - 20}>
              {formatTime(middleTimestamp)}
            </text>
            <text textAnchor="end" x={chart.width - chart.right} y={chart.height - 20}>
              {formatTime(lastTimestamp)} UTC
            </text>
          </g>
        </svg>
      </div>
      <figcaption>{t('caption', { caption, unit })}</figcaption>
    </figure>
  )
}
