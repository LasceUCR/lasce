import es from '@/messages/es.json' with { type: 'json' }

/** The `scientificTools` namespace of a message catalogue. */
export type ScientificToolsMessages = typeof es.scientificTools

const SWAAT_URL = process.env.NEXT_PUBLIC_SWAAT_URL ?? 'https://swaat.up.railway.app/'

/**
 * The tools offered on `/herramientas-cientificas`, described in the language of `messages`.
 * Their names are product names and are the same in every language.
 */
export function getScientificTools(messages: ScientificToolsMessages) {
  return [
    {
      title: 'SWAAT',
      description: messages.tools.swaat,
      href: SWAAT_URL,
      imageSrc: '/images/tools/SWAAT-sun.webp',
    },
    {
      title: 'SWAPRO',
      description: messages.tools.swapro,
      href: 'https://swapro.up.railway.app/',
      imageSrc: '/images/research/geomagnetismo-costa-rica.jpg',
    },
  ] as const
}

/** The tools in Spanish, the source language. For stories and tests. */
export const scientificTools = getScientificTools(es.scientificTools)

export const scientificToolsIntro = es.scientificTools.hero.intro
