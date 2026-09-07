import {
  BookOpen,
  ChartNoAxesCombined,
  Orbit,
  RadioTower,
  Sun,
  Telescope,
  type LucideIcon,
} from 'lucide-react'

export const workAreasSectionId = 'areas-de-trabajo'

export const workAreaSlugs = ['fisica-solar', 'clima-espacial', 'radioastronomia'] as const

export type WorkAreaSlug = (typeof workAreaSlugs)[number]

export type AreaCardDefinition = {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

export const workAreas = {
  'fisica-solar': {
    title: 'Física solar',
    description: 'Actividad y observaciones',
    icon: Sun,
  },
  'clima-espacial': {
    title: 'Clima espacial',
    description: 'Fenómenos solares y sus efectos',
    icon: Orbit,
  },
  radioastronomia: {
    title: 'Radioastronomía',
    description: 'Datos ROSAC',
    icon: RadioTower,
  },
} as const satisfies Record<
  WorkAreaSlug,
  Pick<AreaCardDefinition, 'title' | 'description' | 'icon'>
>

export const portalAccessAreas = [
  {
    icon: Telescope,
    title: 'Instrumentación',
    description: 'Instrumentos y citación',
    href: '/instrumentacion',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Datos y análisis',
    description: 'Consulta y descargas',
    href: '/datos',
  },
  {
    icon: BookOpen,
    title: 'Divulgación',
    description: 'Noticias y recursos',
    href: '/noticias',
  },
] as const satisfies readonly AreaCardDefinition[]

export function workAreaPath(slug: WorkAreaSlug): `/${WorkAreaSlug}` {
  return `/${slug}`
}

export function isWorkAreaSlug(value: string): value is WorkAreaSlug {
  return workAreaSlugs.includes(value as WorkAreaSlug)
}

export function getWorkAreaCards(): AreaCardDefinition[] {
  return workAreaSlugs.map((slug) => ({
    ...workAreas[slug],
    href: workAreaPath(slug),
  }))
}

export function getHomeAreaCards(): AreaCardDefinition[] {
  return [...getWorkAreaCards(), ...portalAccessAreas]
}
