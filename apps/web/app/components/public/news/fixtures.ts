import type { NewsArticle } from '@/app/lib/news-schema'

/**
 * News items shaped as `getNews` returns them, shared by the stories of the news components (and
 * so by their tests, which reuse the stories' `args`).
 */

export const VERSION = '2026-05-24T12:00:00.000Z'

const spanish = {
  title:
    '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
  abstract:
    'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC, el radiotelescopio de la Universidad de Costa Rica dedicado al estudio de la actividad solar.',
}

const english = {
  title: '“Nothing happens here?” Five scientific projects to get excited about in Costa Rica',
  abstract:
    'A feature on Costa Rican scientific projects, among them ROSAC, the University of Costa Rica radio telescope devoted to studying solar activity.',
}

/** A complete item read in Spanish, as a visitor gets it. */
export const spanishArticle: NewsArticle = {
  slug: '6f0c1f43-6c5e-4c1b-9f0e-6d1b8f1f2a01',
  ...spanish,
  authors: 'Jorge Arturo Mora',
  source: 'La Nación – Revista Dominical',
  date: '24 de mayo de 2026',
  publishedAt: '2026-05-24',
  href: 'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
  contentLocale: 'es',
}

/** The same item read in English. */
export const englishArticle: NewsArticle = {
  ...spanishArticle,
  ...english,
  date: 'May 24, 2026',
  contentLocale: 'en',
}

/** The Spanish item as an editor gets it: every language and the version to save against. */
export const editableArticle: NewsArticle = {
  ...spanishArticle,
  editing: {
    content: { es: spanish, en: english },
    isLegacy: false,
    version: VERSION,
  },
}

/** An item saved before languages existed: no English row, and its base text's language unknown. */
export const legacyArticle: NewsArticle = {
  ...spanishArticle,
  slug: '6f0c1f43-6c5e-4c1b-9f0e-6d1b8f1f2a02',
  title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
  abstract:
    'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas.',
  authors: 'Gerardo Quesada A.',
  source: 'El Norte Hoy',
  date: '2 de octubre de 2023',
  publishedAt: '2023-10-02',
  href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
  contentLocale: null,
  editing: {
    content: {
      es: {
        title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
        abstract:
          'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas.',
      },
      en: null,
    },
    isLegacy: true,
    version: VERSION,
  },
}

/** An item with no publication date: it sorts last and the card says so. */
export const undatedArticle: NewsArticle = {
  ...spanishArticle,
  slug: '6f0c1f43-6c5e-4c1b-9f0e-6d1b8f1f2a03',
  title:
    'Prysmian dona $36.000 en cables de energía y telecomunicaciones para el desarrollo del único radio telescopio solar de su tipo en Centroamérica',
  abstract:
    'Prysmian donó cerca de tres kilómetros de cables de energía y telecomunicaciones para apoyar el desarrollo y puesta en funcionamiento del radiotelescopio solar ROSAC.',
  authors: 'Prysmian',
  source: 'Prysmian Pro',
  date: null,
  publishedAt: null,
  href: 'https://prysmianpro.com/en/prysmian-group-dona-36-000-en-cables-de-energia-y-telecomunicaciones-para-el-desarrollo-del-unico-radio-telescopio-solar-de-su-tipo-en-centroamerica/',
}
