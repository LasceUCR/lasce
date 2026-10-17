import es from '@/messages/es.json' with { type: 'json' }

/**
 * The space weather page (`/clima-espacial`). This module holds its structure: which cards and
 * steps exist and in what order. The text is in the `spaceWeather` namespace of
 * `apps/web/messages/`.
 */

export const sunToEarthItemIds = ['release', 'propagation', 'response', 'technology'] as const
export type SunToEarthItemId = (typeof sunToEarthItemIds)[number]

export const spaceWeatherComponentIds = [
  'solarActivity',
  'solarWind',
  'magnetosphere',
  'ionosphere',
  'storms',
  'particles',
] as const
export type SpaceWeatherComponentId = (typeof spaceWeatherComponentIds)[number]

const flowStepIds = ['sun', 'solarWind', 'magnetosphere', 'earth'] as const

interface Card<TId extends string> {
  id: TId
  title: string
  description: string
}

export interface SpaceWeatherContent {
  hero: { kicker: string; title: string }
  definition: { title: string; paragraphs: readonly string[] }
  sunToEarth: { title: string; items: readonly Card<SunToEarthItemId>[] }
  costaRica: { title: string; paragraphs: readonly string[] }
  components: {
    title: string
    intro: string
    items: readonly Card<SpaceWeatherComponentId>[]
    flow: { title: string; steps: readonly string[]; caption: string }
  }
  backLink: { href: string; label: string }
}

/** The parts of a message catalogue the page reads. */
export type SpaceWeatherMessages = Pick<typeof es, 'spaceWeather' | 'common'>

/** The page in the language of `messages`. The route passes the request's catalogue. */
export function getSpaceWeatherContent({
  spaceWeather,
  common,
}: SpaceWeatherMessages): SpaceWeatherContent {
  const { hero, definition, sunToEarth, costaRica, components } = spaceWeather

  return {
    hero,
    definition: { title: definition.title, paragraphs: [definition.p1] },
    sunToEarth: {
      title: sunToEarth.title,
      items: sunToEarthItemIds.map((id) => ({ id, ...sunToEarth.items[id] })),
    },
    costaRica: { title: costaRica.title, paragraphs: [costaRica.p1] },
    components: {
      title: components.title,
      intro: components.intro,
      items: spaceWeatherComponentIds.map((id) => ({ id, ...components.items[id] })),
      flow: {
        title: components.flow.title,
        steps: flowStepIds.map((id) => components.flow.steps[id]),
        caption: components.flow.caption,
      },
    },
    backLink: { href: '/#areas-de-trabajo', label: common.backToWorkAreas },
  }
}

/** The page in Spanish, the source language. For stories and tests. */
export const spaceWeatherContent = getSpaceWeatherContent(es)

export const spaceWeatherMeta = es.spaceWeather.meta
export const spaceWeatherHero = spaceWeatherContent.hero
export const spaceWeatherDefinition = spaceWeatherContent.definition
export const spaceWeatherSunToEarth = spaceWeatherContent.sunToEarth
export const spaceWeatherCostaRica = spaceWeatherContent.costaRica
export const spaceWeatherComponents = spaceWeatherContent.components
export const spaceWeatherBackLink = spaceWeatherContent.backLink
