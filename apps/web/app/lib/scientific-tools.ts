import { ChartNoAxesCombined, Sun } from 'lucide-react'

export const scientificToolsIntro =
  'Accede a herramientas para el análisis de la actividad solar y el estudio del clima espacial.'

const SWAAT_URL = process.env.NEXT_PUBLIC_SWAAT_URL ?? 'https://swaat.up.railway.app/'

export const scientificTools = [
  {
    title: 'SWAAT',
    description:
      'Analiza eventos solares mediante observaciones de rayos X de GOES y microondas de RSTN. Visualiza y compara su evolución temporal con gráficas estáticas e interactivas.',
    href: SWAAT_URL,
    icon: Sun,
  },
  {
    title: 'SWAPRO',
    description:
      'Consulta y visualiza eventos solares en intervalos de tiempo específicos para apoyar el estudio de la actividad solar y el clima espacial.',
    href: 'https://swapro.up.railway.app/',
    icon: ChartNoAxesCombined,
  },
] as const
