import { useId } from 'react'

import type { ScientificDataPoint } from '@/app/lib/scientific-data'

export interface ScientificDataChartProps {
  caption: string
  label: string
  points: ScientificDataPoint[]
  unit: string
}

const chart = {
  height: 320,
  width: 760,
  top: 28,
  right: 28,
  bottom: 54,
  left: 74,
}

const numberFormatter = new Intl.NumberFormat('es-CR', {
  maximumSignificantDigits: 4,
  notation: 'scientific',
})

function formatValue(value: number) {
  return numberFormatter.format(value)
}

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

export function ScientificDataChart({ caption, label, points, unit }: ScientificDataChartProps) {
  const titleId = useId()
  const descriptionId = useId()
  if (!points.length) {
    return (
      <p className="content-empty" role="status">
        No hay valores para graficar.
      </p>
    )
  }
  const values = points.map((point) => point.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const valueRange = maximum - minimum || Math.abs(maximum) * 0.1 || 1
  const plotWidth = chart.width - chart.left - chart.right
  const plotHeight = chart.height - chart.top - chart.bottom

  const firstInstant = Date.parse(points[0]!.timestamp)
  const lastInstant = Date.parse(points.at(-1)!.timestamp)
  const duration = lastInstant - firstInstant
  const coordinates = points.map((point) => {
    const x =
      chart.left +
      (duration === 0
        ? plotWidth / 2
        : ((Date.parse(point.timestamp) - firstInstant) / duration) * plotWidth)
    const y =
      chart.top + ((maximum - point.value + valueRange * 0.08) / (valueRange * 1.16)) * plotHeight
    return { ...point, x, y }
  })

  const path = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const middleTimestamp = new Date(firstInstant + duration / 2).toISOString()

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
          <title id={titleId}>Gráfica de {label}</title>
          <desc id={descriptionId}>
            Serie de {points.length} mediciones entre {formatTime(points[0]!.timestamp)} y{' '}
            {formatTime(points.at(-1)!.timestamp)} UTC. El valor mínimo es {formatValue(minimum)} y
            el máximo es {formatValue(maximum)} {unit}.
          </desc>

          {[0, 0.5, 1].map((ratio) => {
            const y = chart.top + ratio * plotHeight
            const value = maximum + valueRange * 0.08 - ratio * valueRange * 1.16

            return (
              <g aria-hidden="true" key={ratio}>
                <line
                  className="data-chart-grid"
                  x1={chart.left}
                  x2={chart.width - chart.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="data-chart-axis-text"
                  textAnchor="end"
                  x={chart.left - 12}
                  y={y + 4}
                >
                  {formatValue(value)}
                </text>
              </g>
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

          <polyline aria-hidden="true" className="data-chart-line" points={path} />
          {coordinates.map(({ timestamp, value, x, y }) => (
            <circle
              aria-hidden="true"
              className="data-chart-point"
              cx={x}
              cy={y}
              key={timestamp}
              r={points.length > 60 ? '1.5' : '3'}
            >
              <title>
                {formatTime(timestamp)} UTC: {formatValue(value)} {unit}
              </title>
            </circle>
          ))}

          <g aria-hidden="true" className="data-chart-axis-text">
            <text textAnchor="start" x={chart.left} y={chart.height - 20}>
              {formatTime(points[0]!.timestamp)}
            </text>
            <text textAnchor="middle" x={chart.left + plotWidth / 2} y={chart.height - 20}>
              {formatTime(middleTimestamp)}
            </text>
            <text textAnchor="end" x={chart.width - chart.right} y={chart.height - 20}>
              {formatTime(points.at(-1)!.timestamp)} UTC
            </text>
          </g>
        </svg>
      </div>
      <figcaption>
        {caption} Unidad: {unit}.
      </figcaption>
    </figure>
  )
}
