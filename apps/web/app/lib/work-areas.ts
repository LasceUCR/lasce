import {
  BookOpen,
  ChartNoAxesCombined,
  Orbit,
  RadioTower,
  Sun,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

// The import attribute is for Playwright: `tests/e2e/accessibility-seo.spec.ts` reaches this
// module through `site.ts` under Node's own ESM loader, which refuses a JSON module without it.
import es from '@/messages/es.json' with { type: 'json' }

export const workAreasSectionId = 'areas-de-trabajo'

export const workAreaSlugs = ['fisica-solar', 'clima-espacial', 'radioastronomia'] as const

export type WorkAreaSlug = (typeof workAreaSlugs)[number]

export type AreaCardDefinition = {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

/** The `workAreas` namespace of a message catalogue: the title and description of every card. */
export type WorkAreaMessages = typeof es.workAreas

// Structure only: which card is which, its icon and where it leads. The text is in the
// `workAreas` namespace of `apps/web/messages/`.
const workAreaCards = {
  'fisica-solar': { message: 'solarPhysics', icon: Sun },
  'clima-espacial': { message: 'spaceWeather', icon: Orbit },
  radioastronomia: { message: 'rosac', icon: RadioTower },
} as const satisfies Record<WorkAreaSlug, { message: keyof WorkAreaMessages; icon: LucideIcon }>

const portalAccessCards = [
  { message: 'tools', icon: Wrench, href: '/herramientas-cientificas' },
  { message: 'data', icon: ChartNoAxesCombined, href: '/datos' },
  { message: 'outreach', icon: BookOpen, href: '/noticias' },
] as const satisfies readonly { message: keyof WorkAreaMessages; icon: LucideIcon; href: string }[]

function buildWorkAreas(
  messages: WorkAreaMessages,
): Record<WorkAreaSlug, Pick<AreaCardDefinition, 'title' | 'description' | 'icon'>> {
  return {
    'fisica-solar': { ...messages.solarPhysics, icon: workAreaCards['fisica-solar'].icon },
    'clima-espacial': { ...messages.spaceWeather, icon: workAreaCards['clima-espacial'].icon },
    radioastronomia: { ...messages.rosac, icon: workAreaCards.radioastronomia.icon },
  }
}

/** The work areas in Spanish, the source language. */
export const workAreas = buildWorkAreas(es.workAreas)

export function workAreaPath(slug: WorkAreaSlug): `/${WorkAreaSlug}` {
  return `/${slug}`
}

export function isWorkAreaSlug(value: string): value is WorkAreaSlug {
  return workAreaSlugs.includes(value as WorkAreaSlug)
}

/**
 * One card per work area, in the language of `messages`. Defaults to Spanish, the source
 * language; a page passes the request's catalogue.
 */
export function getWorkAreaCards(messages: WorkAreaMessages = es.workAreas): AreaCardDefinition[] {
  return workAreaSlugs.map((slug) => ({
    ...messages[workAreaCards[slug].message],
    icon: workAreaCards[slug].icon,
    href: workAreaPath(slug),
  }))
}

/** The work areas followed by the portal's other entry points. */
export function getHomeAreaCards(messages: WorkAreaMessages = es.workAreas): AreaCardDefinition[] {
  return [
    ...getWorkAreaCards(messages),
    ...portalAccessCards.map((card) => ({
      ...messages[card.message],
      icon: card.icon,
      href: card.href,
    })),
  ]
}
