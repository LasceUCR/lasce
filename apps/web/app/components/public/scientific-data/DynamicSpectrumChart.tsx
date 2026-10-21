'use client'

import { useTranslations } from 'next-intl'
import { useId } from 'react'

import {
  DYNAMIC_SPECTRUM_CHART as chart,
  layoutDynamicSpectrum,
} from '@/app/lib/charts/dynamicSpectrumLayout'
import type { DynamicSpectrumCell } from '@/app/lib/scientific-data'

export interface DynamicSpectrumChartProps {
  label: string
  caption: string
  cells: DynamicSpectrumCell[]
  frequencies: number[]
  timestamps: string[]
  frequencyUnit: string
  unit: string
}

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

function colorFor(intensity: number) {
  return `color-mix(in srgb, var(--blue-dark) ${intensity * 100}%, var(--alice-blue))`
}

export function DynamicSpectrumChart({
  label,
  caption,
  cells,
  frequencies,
  timestamps,
  frequencyUnit,
  unit,
}: DynamicSpectrumChartProps) {
  const t = useTranslations('scientificData.charts')
  const titleId = useId()
  const descriptionId = useId()
  const layout = layoutDynamicSpectrum({ cells, frequencies, timestamps })
  if (!layout) {
    return (
      <p className="content-empty" role="status">
        {t('empty')}
      </p>
    )
  }
  const { firstTimestamp, lastTimestamp, maximum, middleTimestamp, minimum, plotWidth, rects } =
    layout

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
          <title id={titleId}>{label}</title>
          <desc id={descriptionId}>
            {t('spectrumDescription', {
              minFreq: frequencies[0]!,
              maxFreq: frequencies.at(-1)!,
              frequencyUnit,
              start: formatTime(firstTimestamp),
              end: formatTime(lastTimestamp),
              minimum: minimum.toFixed(2),
              maximum: maximum.toFixed(2),
              unit,
            })}
          </desc>

          {rects.map(({ key, x, y, width, height, intensity }) => (
            <rect
              aria-hidden="true"
              fill={colorFor(intensity)}
              height={height}
              key={key}
              width={width}
              x={x}
              y={y}
            />
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

          <g aria-hidden="true" className="data-chart-axis-text">
            {[frequencies[0]!, frequencies.at(-1)!].map((frequency, index) => (
              <text
                key={frequency}
                textAnchor="end"
                x={chart.left - 10}
                y={index === 0 ? chart.height - chart.bottom + 4 : chart.top + 4}
              >
                {frequency} {frequencyUnit}
              </text>
            ))}
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
      <div aria-hidden="true" className="data-color-legend">
        <span>{t('low')}</span>
        <span className="data-color-scale" />
        <span>{t('high')}</span>
      </div>
      <figcaption>{t('spectrumCaption', { caption, frequencyUnit, unit })}</figcaption>
    </figure>
  )
}
