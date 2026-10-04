import es from '@/messages/es.json' with { type: 'json' }

/**
 * The solar astrophysics page (`/fisica-solar`). This module holds its structure: which cards
 * and steps exist and in what order. The text is in the `solarPhysics` namespace of
 * `apps/web/messages/`.
 */

export const solarOverviewItemIds = ['activity', 'magneticField', 'sunEarth', 'analysis'] as const
export type SolarOverviewItemId = (typeof solarOverviewItemIds)[number]

const flowStepIds = ['sun', 'disturbance', 'terrestrial', 'analysis'] as const
const lasceParagraphIds = ['p1', 'p2', 'p3'] as const

export interface SolarAstrophysicsContent {
  hero: { kicker: string; title: string; introduction: string }
  overview: {
    title: string
    intro: string
    items: readonly { id: SolarOverviewItemId; title: string; description: string }[]
    flow: { title: string; steps: readonly string[]; caption: string }
  }
  lasce: { title: string; paragraphs: readonly string[] }
  backLink: { href: string; label: string }
}

/** The parts of a message catalogue the page reads. */
export type SolarAstrophysicsMessages = Pick<typeof es, 'solarPhysics' | 'common'>

/** The page in the language of `messages`. The route passes the request's catalogue. */
export function getSolarAstrophysicsContent({
  solarPhysics,
  common,
}: SolarAstrophysicsMessages): SolarAstrophysicsContent {
  const { hero, overview, lasce } = solarPhysics

  return {
    hero,
    overview: {
      title: overview.title,
      intro: overview.intro,
      items: solarOverviewItemIds.map((id) => ({ id, ...overview.items[id] })),
      flow: {
        title: overview.flow.title,
        steps: flowStepIds.map((id) => overview.flow.steps[id]),
        caption: overview.flow.caption,
      },
    },
    lasce: {
      title: lasce.title,
      paragraphs: lasceParagraphIds.map((id) => lasce[id]),
    },
    backLink: { href: '/#areas-de-trabajo', label: common.backToWorkAreas },
  }
}

/** The page in Spanish, the source language. For stories and tests. */
export const solarAstrophysicsContent = getSolarAstrophysicsContent(es)
