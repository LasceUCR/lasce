import { useId } from 'react'

export interface LineChartPoint {
  label: string
  value: number
}

export interface LineChartThreshold {
  value: number
  label: string
}

export interface LineChartProps {
  title: string
  description: string
  yLabel: string
  yMax: number
  yTicks: readonly number[]
  points: readonly LineChartPoint[]
  threshold?: LineChartThreshold
}

const width = 640
const height = 280
const padding = { top: 24, right: 20, bottom: 40, left: 44 }

function xForIndex(index: number, count: number) {
  const innerWidth = width - padding.left - padding.right
  if (count <= 1) {
    return padding.left
  }

  return padding.left + (index / (count - 1)) * innerWidth
}

function yForValue(value: number, yMax: number) {
  const innerHeight = height - padding.top - padding.bottom
  return padding.top + ((yMax - value) / yMax) * innerHeight
}

export function LineChart({ title, description, yLabel, yMax, yTicks, points, threshold }: LineChartProps) {
  const captionId = useId()
  const descriptionId = useId()
  const polyline = points
    .map((point, index) => `${xForIndex(index, points.length)},${yForValue(point.value, yMax)}`)
    .join(' ')
  const area = `${padding.left},${yForValue(0, yMax)} ${polyline} ${xForIndex(points.length - 1, points.length)},${yForValue(0, yMax)}`
  const thresholdY = threshold ? yForValue(threshold.value, yMax) : null

  return (
    <figure className="surface-card line-chart">
      <figcaption id={captionId}>{title}</figcaption>
      <svg
        aria-describedby={descriptionId}
        aria-labelledby={captionId}
        className="line-chart-svg"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <desc id={descriptionId}>{description}</desc>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              className={threshold?.value === tick ? 'line-chart-threshold' : 'line-chart-grid'}
              x1={padding.left}
              x2={width - padding.right}
              y1={yForValue(tick, yMax)}
              y2={yForValue(tick, yMax)}
            />
            <text className="line-chart-axis" x={padding.left - 8} y={yForValue(tick, yMax) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        <line
          className="line-chart-axis-line"
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
        />
        <line
          className="line-chart-axis-line"
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
        />
        <polygon className="line-chart-area" points={area} />
        <polyline className="line-chart-line" fill="none" points={polyline} />
        {points.map((point, index) => (
          <g key={point.label}>
            <circle
              className="line-chart-point"
              cx={xForIndex(index, points.length)}
              cy={yForValue(point.value, yMax)}
              r="4"
            />
            <text
              className="line-chart-axis"
              textAnchor="middle"
              x={xForIndex(index, points.length)}
              y={height - padding.bottom + 20}
            >
              {point.label}
            </text>
          </g>
        ))}
        <text
          className="line-chart-axis line-chart-ylabel"
          textAnchor="middle"
          transform={`translate(14 ${height / 2}) rotate(-90)`}
        >
          {yLabel}
        </text>
        {threshold && thresholdY !== null ? (
          <text className="line-chart-threshold-label" textAnchor="end" x={width - padding.right} y={thresholdY - 8}>
            {threshold.label}
          </text>
        ) : null}
      </svg>
    </figure>
  )
}
