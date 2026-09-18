import { useId } from 'react'

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

const chart = { width: 760, height: 350, top: 28, right: 36, bottom: 54, left: 72 }

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

function colorFor(value: number, minimum: number, maximum: number) {
  const ratio = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum)
  return `color-mix(in srgb, var(--blue-dark) ${ratio * 100}%, var(--alice-blue))`
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
  const titleId = useId()
  const descriptionId = useId()
  if (!cells.length || !frequencies.length || !timestamps.length) {
    return (
      <p className="content-empty" role="status">
        No hay valores para graficar.
      </p>
    )
  }
  const values = cells.map(({ value }) => value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const plotWidth = chart.width - chart.left - chart.right
  const plotHeight = chart.height - chart.top - chart.bottom
  const cellWidth = plotWidth / timestamps.length
  const cellHeight = plotHeight / frequencies.length
  const timestampIndexes = new Map(timestamps.map((timestamp, index) => [timestamp, index]))
  const frequencyIndexes = new Map(frequencies.map((frequency, index) => [frequency, index]))
  const firstTimestamp = timestamps[0]!
  const middleTimestamp = timestamps[Math.floor((timestamps.length - 1) / 2)]!
  const lastTimestamp = timestamps.at(-1)!

  return (
    <figure className="data-chart-figure">
      <div
        className="data-chart-viewport"
        role="region"
        aria-label={`Área de gráfica: ${label}`}
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
            Mapa de intensidad por tiempo y frecuencia, desde {frequencies[0]} hasta{' '}
            {frequencies.at(-1)} {frequencyUnit} y desde {formatTime(firstTimestamp)} hasta{' '}
            {formatTime(lastTimestamp)} UTC. Los valores van de {minimum.toFixed(2)} a{' '}
            {maximum.toFixed(2)} {unit}.
          </desc>

          {cells.map((cell) => {
            const xIndex = timestampIndexes.get(cell.timestamp)!
            const frequencyIndex = frequencyIndexes.get(cell.frequency)!

            return (
              <rect
                aria-hidden="true"
                fill={colorFor(cell.value, minimum, maximum)}
                height={cellHeight + 0.5}
                key={`${cell.timestamp}-${cell.frequency}`}
                width={cellWidth + 0.5}
                x={chart.left + xIndex * cellWidth}
                y={chart.top + (frequencies.length - frequencyIndex - 1) * cellHeight}
              />
            )
          })}

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
        <span>Baja</span>
        <span className="data-color-scale" />
        <span>Alta</span>
      </div>
      <figcaption>
        {caption} Frecuencia en {frequencyUnit}; color según {unit}.
      </figcaption>
    </figure>
  )
}
