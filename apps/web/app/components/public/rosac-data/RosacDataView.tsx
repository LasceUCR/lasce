'use client'

import { ContentFlag } from '@/app/components/public/topic/ContentFlag'

import dynamic from 'next/dynamic'
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface rosacDataViewProps {
  labelX: string
  labelY: string
  times: string[]
  frequencies: number[]
  intensity: number[][]
}

export function RosacDataView({
  labelX,
  labelY,
  times,
  frequencies,
  intensity,
}: rosacDataViewProps) {
  if (!times.length || !frequencies.length || !intensity.length) {
    return (
      <ContentFlag
        label="No hay datos disponibles"
        message="No se encontraron datos para el intervalo ingresado"
      />
    )
  }

  return (
    <Plot
      data={[
        {
          type: 'heatmap',
          x: times,
          y: frequencies,
          z: intensity,
          colorscale: 'Greys',
          reversescale: true,
          colorbar: {
            title: 'Power',
          },
        },
      ]}
      layout={{
        autosize: true,
        height: 400,
        margin: {
          l: 70,
          r: 20,
          t: 20,
          b: 50,
        },
        xaxis: {
          title: { text: labelX },
        },
        yaxis: {
          title: { text: labelY },
        },
      }}
      useResizeHandler
      style={{
        width: '100%',
      }}
    />
  )
}
