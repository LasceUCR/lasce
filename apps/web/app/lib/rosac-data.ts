/**
 * This module describes the scientific consultation page only.
 */

export const rosacDataHero = {
  kicker: 'Portal de consulta ROSAC',
  title: 'Radio monitoreo',
  lead: '',
} as const

export const rosacMockData = {
  labelX: 'Tiempo (UTC)',
  labelY: 'Frecuencia (MHz)',
  times: ['19:00', '19:01', '19:02', '19:03', '19:04'],
  frequencies: [10, 20, 30, 40, 50],
  intensity: [
    [0.1, 0.2, 0.8, 0.3, 0.1],
    [0.2, 0.4, 0.9, 0.2, 0.1],
    [0.1, 0.3, 0.5, 0.4, 0.2],
    [0.2, 0.1, 0.2, 0.7, 0.3],
    [0.1, 0.2, 0.1, 0.3, 0.8],
  ],
}
