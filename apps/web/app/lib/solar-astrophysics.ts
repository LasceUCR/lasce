import es from '@/messages/es.json' with { type: 'json' }

/**
 * The solar astrophysics page (`/fisica-solar`). This module holds its structure: which cards
 * and steps exist and in what order. The text is in the `solarPhysics` namespace of
 * `apps/web/messages/`. The "El trabajo de LASCE" section is not here: it is editable database
 * content (`solar-physics-section.ts`).
 */

export const solarOverviewItemIds = ['activity', 'magneticField', 'sunEarth', 'analysis'] as const
export type SolarOverviewItemId = (typeof solarOverviewItemIds)[number]

const flowStepIds = ['sun', 'disturbance', 'terrestrial', 'analysis'] as const
const nextStepIds = ['spaceWeather'] as const
const nextStepHrefs = {
  spaceWeather: '/clima-espacial',
} as const

export interface SolarAstrophysicsContent {
  hero: { kicker: string; title: string; introduction: string }
  observation: {
    alt: string
    loading: string
    unavailable: string
    observedLabel: string
    source: string
    dataLink: { title: string; description: string; label: string; href: string }
  }
  overview: {
    title: string
    intro: string
    items: readonly { id: SolarOverviewItemId; title: string; description: string }[]
    flow: { title: string; steps: readonly string[]; caption: string }
  }
  nextSteps: {
    title: string
    links: readonly { id: (typeof nextStepIds)[number]; href: string; label: string }[]
  }
  backLink: { href: string; label: string }
}

/** The parts of a message catalogue the page reads. */
export type SolarAstrophysicsMessages = Pick<typeof es, 'solarPhysics' | 'common'>

/** The page in the language of `messages`. The route passes the request's catalogue. */
export function getSolarAstrophysicsContent({
  solarPhysics,
  common,
}: SolarAstrophysicsMessages): SolarAstrophysicsContent {
  const { hero, overview } = solarPhysics

  return {
    hero,
    observation: {
      ...solarPhysics.observation,
      dataLink: { ...solarPhysics.observation.dataLink, href: '/datos' },
    },
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
    nextSteps: {
      title: solarPhysics.nextSteps.title,
      links: nextStepIds.map((id) => ({
        id,
        href: nextStepHrefs[id],
        label: solarPhysics.nextSteps.links[id],
      })),
    },
    backLink: { href: '/#areas-de-trabajo', label: common.backToWorkAreas },
  }
}

/** The page in Spanish, the source language. For stories and tests. */
export const solarAstrophysicsContent = getSolarAstrophysicsContent(es)
