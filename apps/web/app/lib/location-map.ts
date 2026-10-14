/** Accessible names for the shared Leaflet map. Spanish is the default used by ROSAC. */
export interface LocationMapLabels {
  regionName: string
  interactiveName: string
  instructions: string
  zoomInTitle: string
  zoomOutTitle: string
}

/** Esri World Imagery. `{z}/{y}/{x}` is the tile order this provider expects. */
export const locationMapProvider = {
  tileUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  loadTimeoutMs: 15_000,
} as const

/** The names the ROSAC map has always used. Another page can pass its own labels. */
export function spanishLocationMapLabels(markerLabel: string): LocationMapLabels {
  return {
    regionName: `Mapa de ubicación de ${markerLabel}`,
    interactiveName: `Mapa interactivo de ${markerLabel}`,
    instructions:
      'Use las flechas para desplazar el mapa y las teclas más y menos para cambiar el zoom. Presione Tab para salir del mapa.',
    zoomInTitle: 'Acercar',
    zoomOutTitle: 'Alejar',
  }
}
