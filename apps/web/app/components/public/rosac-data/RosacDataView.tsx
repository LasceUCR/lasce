'use client'

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
  return (
    <div>
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
    </div>
  )
}
