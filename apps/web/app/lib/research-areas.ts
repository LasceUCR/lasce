import { prisma, type Prisma } from '@lasce/db'
import { z } from 'zod'

import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { translationLocales } from '@/app/lib/i18n/content/definition'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'

import {
  researchAreaContent,
  type ResearchArea,
  type ResearchAreaCreateInput,
  type ResearchAreaReviewConfirmation,
  type ResearchAreaUpdateInput,
} from './research-area-schema'

/**
 * Fixture areas for stories and tests, in Spanish only. The public pages read the areas from the
 * database (`getResearchAreas`), where `packages/db/prisma/seed.ts` writes them in both
 * languages.
 */
export const researchAreas: ResearchArea[] = [
  {
    id: 'radioastronomia-solar-evolucion-flares-cmes',
    title: 'Radioastronomía solar y evolución de Flares-CMEs',
    description:
      'Estudia las emisiones solares de radio y su relación con los flares, la evolución de las eyecciones de masa coronal, la aceleración de partículas y su propagación hacia el medio interplanetario.',
    src: '/images/research/radioastronomia-solar-evolucion-flares-cmes.jpg',
  },
  {
    id: 'geomagnetismo-respuesta-regional-clima-espacial',
    title: 'Geomagnetismo y respuesta regional al clima espacial',
    description:
      'Analiza las variaciones del campo magnético terrestre producidas por la actividad solar. Incluye el cálculo de índices geomagnéticos para Costa Rica. Este estudio se lleva a cabo gracias al desarrollo de una tesis doctoral de la MSc. Johana Camacho en colaboración con el Instituto Nacional de Electricidad (ICE) y el Servicio de Clima Espacial México (SCiESMEX).',
    src: '/images/research/geomagnetismo-respuesta-regional-clima-espacial.jpg',
  },
  {
    id: 'propagacion-prediccion-cmes-hacia-tierra',
    title: 'Propagación y predicción de CMEs hacia la Tierra',
    description:
      'Desarrolla modelos y herramientas para estimar la velocidad, la trayectoria y el tiempo de llegada de las CMEs a la Tierra. Esta rama incluye el desarrollo de la herramienta científica computacional SWAAT y su futura integración con observaciones de ROSAC.',
    src: '/images/research/propagacion-prediccion-cmes-hacia-tierra.png',
  },
  {
    id: 'inteligencia-artificial-ciencia-datos-clima-espacial',
    title: 'Inteligencia artificial y ciencia de datos aplicada al clima espacial',
    description:
      'Emplea aprendizaje automático, automatización y generación de datos sintéticos para identificar eventos solares, procesar grandes volúmenes de observaciones y mejorar la predicción de fenómenos de clima espacial.',
    src: '/images/research/inteligencia-artificial-ciencia-datos-clima-espacial.jpg',
  },
  {
    id: 'ionosfera-gnss-efectos-tecnologicos-clima-espacial',
    title: 'Ionosfera GNSS y efectos tecnológicos del clima espacial',
    description:
      'Busca hacer observaciones desde Costa Rica con equipos GNSS para determinar cómo la actividad solar y geomagnética modifica la ionosfera y afecta los sistemas de navegación satelital, las comunicaciones y otras tecnologías sensibles a las condiciones del entorno espacial en nuestro país.',
    src: '/images/research/ionosfera-gnss-efectos-tecnologicos-clima-espacial.jpg',
  },
  {
    id: 'infraestructura-informatica-gestion-datos-clima-espacial',
    title: 'Infraestructura informática y gestión de datos de clima espacial',
    description:
      'Diseña y desarrolla plataformas informáticas para capturar, procesar, almacenar y consultar grandes volúmenes de datos solares provenientes de distintas fuentes. Esta rama también implementa bases de datos y servicios web especializados, y facilita el análisis interdisciplinario de la información en colaboración con investigadores en astrofísica solar y clima espacial.',
    src: '/images/research/infraestructura-informatica-gestion-datos-clima-espacial.jpg',
  },
  {
    id: 'geomagnetismo-costa-rica',
    title: 'Geomagnetismo en Costa Rica',
    description:
      'Estudia las variaciones del campo magnético terrestre ante diferentes condiciones de actividad solar y geomagnética. Esta rama utiliza mediciones magnéticas realizadas en tiempo real en nuestro país para calcular índices geomagnéticos específicos para Costa Rica y desarrollar herramientas de monitoreo adaptadas al entorno regional.',
    src: '/images/research/geomagnetismo-costa-rica.jpg',
  },
]

export const researchAreaIds = researchAreas.map((area) => area.id)

/** The translation rows read with an area, for the locales the site supports. */
const areaInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, description: true },
  },
} satisfies Prisma.ResearchAreaInclude

type ResearchAreaRecord = Prisma.ResearchAreaGetPayload<{ include: typeof areaInclude }>

/**
 * An area in `locale`, falling back per record to its base text: a complete area shows Spanish
 * when it has no row for `locale`, and an area saved before translations existed shows its base
 * text in an unknown language (`contentLocale: null`). Every language and the version to save
 * against are added only for an editor.
 */
function toResearchArea(
  record: ResearchAreaRecord,
  locale: Locale,
  includeEditingData = false,
): ResearchArea {
  const stored = storedContentFrom(researchAreaContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.id,
    title: content.title,
    description: content.description,
    src: record.src ?? undefined,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

/**
 * Every area, oldest first, in `locale` (the language of the request's `lasce_locale` cookie).
 * Pass `includeEditingData` only after a server-side check of the edit permission.
 */
export async function getResearchAreas(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<ResearchArea[]> {
  const records = await prisma.researchArea.findMany({
    include: areaInclude,
    orderBy: { createdAt: 'asc' },
  })

  return records.map((record) => toResearchArea(record, locale, includeEditingData))
}

export async function getResearchAreaById(
  id: string,
  locale: Locale = defaultLocale,
): Promise<ResearchArea | null> {
  if (!z.uuid().safeParse(id).success) return null

  const record = await prisma.researchArea.findUnique({ where: { id }, include: areaInclude })
  return record ? toResearchArea(record, locale) : null
}

export type ResearchAreaWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The area changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: ResearchAreaReviewConfirmation[] }

export type ResearchAreaWriteResult = { ok: true; area: ResearchArea } | ResearchAreaWriteFailure

/**
 * Creates an area with its text in every language, in one transaction. It has no expected
 * failure (no unique column is involved); a database error is thrown for the route to log.
 */
export async function createResearchArea(
  input: ResearchAreaCreateInput,
): Promise<{ ok: true; area: ResearchArea }> {
  const result = await runWrite<ResearchAreaRecord, never>((tx) =>
    tx.researchArea.create({
      data: {
        ...baseContent(researchAreaContent, input.content),
        src: input.src,
        translations: { create: translationRows(researchAreaContent, input.content) },
      },
      include: areaInclude,
    }),
  )

  return { ok: true, area: toResearchArea(result.value, defaultLocale, true) }
}

/**
 * Saves an area against the `version` the editor loaded: its photo, its text in every language
 * (`content`), or both. A photo-only update never touches the translations, so it works on an
 * area that has no English yet.
 */
export async function updateResearchArea(
  id: string,
  input: ResearchAreaUpdateInput,
): Promise<ResearchAreaWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<ResearchAreaRecord, ResearchAreaWriteFailure>(async (tx) => {
    const current = await tx.researchArea.findUnique({ where: { id }, include: areaInclude })
    if (!current) throw new WriteAbort<ResearchAreaWriteFailure>({ ok: false, reason: 'not-found' })
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<ResearchAreaWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const { content } = input
    if (content) {
      const stored = storedContentFrom(researchAreaContent, current, current.translations)
      const pending = findPendingReviews(
        researchAreaContent,
        stored,
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length > 0) {
        throw new WriteAbort<ResearchAreaWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
      }
    }

    // Only while nobody else saved; moves the version strictly forward.
    const { count } = await tx.researchArea.updateMany({
      where: { id, updatedAt: expected },
      data: {
        ...(content ? baseContent(researchAreaContent, content) : {}),
        ...(input.src === undefined ? {} : { src: input.src }),
        updatedAt: nextUpdatedAt(expected),
      },
    })
    if (count === 0)
      throw new WriteAbort<ResearchAreaWriteFailure>({ ok: false, reason: 'conflict' })

    if (content) {
      for (const { locale, ...text } of translationRows(researchAreaContent, content)) {
        await tx.researchAreaTranslation.upsert({
          where: { researchAreaId_locale: { researchAreaId: id, locale } },
          create: { researchAreaId: id, locale, ...text },
          update: text,
        })
      }
    }

    return tx.researchArea.findUniqueOrThrow({ where: { id }, include: areaInclude })
  })

  return result.ok ? { ok: true, area: toResearchArea(result.value, defaultLocale, true) } : result
}

/**
 * Deletes an area in one statement that reports what it removed, so two concurrent deletes give
 * one success and one "not found". Its translations go with it (`ON DELETE CASCADE`).
 */
export async function deleteResearchArea(id: string): Promise<boolean> {
  const { count } = await prisma.researchArea.deleteMany({ where: { id } })
  return count > 0
}
