'use client'

import Plot from "react-plotly.js";

export interface rosacDataViewProps {
  label: string
  times: string[]
  frequencies: number[]
  intensity: number[][]
}

export function RosacDataView({ label, times, frequencies, intensity }: rosacDataViewProps) {
  return (
    <div>
        <Plot data={[
        {
          type: "heatmap",
          x: times,
          y: frequencies,
          z: intensity,
          colorscale: "Greys",
          reversescale: true,
          colorbar: {
            title: "Power",
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
          title: "Time",
        },
        yaxis: {
          title: "Frequency (MHz)",
        },
      }}
      useResizeHandler
      style={{
        width: "100%",
      }} />
    </div>
  )
}