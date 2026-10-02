import { prisma } from '@lasce/db'

import {
  findScientificProduct,
  type ImageSequenceDataResult,
  type ScientificDataQuery,
} from '@/app/lib/scientific-data'

import { ScientificDataUpstreamError } from './errors'

const MAX_SUVI_IMAGES = 8

function queryBounds(query: ScientificDataQuery) {
  return {
    start: new Date(`${query.date}T${query.startTime}:00Z`),
    end: new Date(`${query.date}T${query.endTime}:59.999Z`),
  }
}

function selectEvenly<T>(items: T[], maximum: number): T[] {
  if (items.length <= maximum) return items

  return Array.from({ length: maximum }, (_, index) => {
    const sourceIndex = Math.round((index * (items.length - 1)) / (maximum - 1))
    return items[sourceIndex]!
  })
}

/** `"G19"` → `19`; `null` for a `TELESCOP` value that does not name a GOES spacecraft. */
function satelliteNumber(satellite: string): number | null {
  const match = satellite.match(/^G(\d+)$/i)
  return match ? Number(match[1]) : null
}

async function findFrames(channel: string, start: Date, end: Date) {
  try {
    return await prisma.suviFrame.findMany({
      where: {
        channel,
        observedAt: { gte: start, lte: end },
        previewFile: { not: null },
        qualityFlag: 0,
      },
      select: { id: true, observedAt: true, satellite: true },
      orderBy: { observedAt: 'asc' },
    })
  } catch {
    throw new ScientificDataUpstreamError('No fue posible consultar el archivo de imágenes SUVI.')
  }
}

/**
 * SUVI image sequences from the frames the worker's `suvi-pipeline` catalogues in
 * `solar.suvi_frames`. Each image is served by `/api/suvi/frames/[id]` from MinIO.
 */
export async function querySuviFrames(
  query: ScientificDataQuery,
): Promise<ImageSequenceDataResult> {
  const selection = findScientificProduct(query.source, query.product)
  if (
    !selection ||
    query.source !== 'GOES' ||
    selection.product.visualization !== 'image-sequence'
  ) {
    throw new Error('The SUVI archive only accepts SUVI images')
  }

  const parameter = selection.product.parameters.find(
    (candidate) => candidate.code === query.parameter,
  )!
  const { start, end } = queryBounds(query)
  const frames = await findFrames(query.product, start, end)

  // Never mix spacecraft in one sequence: keep the one that observed most recently.
  const satellite = frames.at(-1)?.satellite
  const satelliteId = satellite ? satelliteNumber(satellite) : null
  const observer = satelliteId ? `GOES-${satelliteId}` : 'GOES'
  const images = selectEvenly(
    frames.filter((frame) => frame.satellite === satellite),
    MAX_SUVI_IMAGES,
  ).map(({ id, observedAt }) => {
    const timestamp = observedAt.toISOString().replace(/\.\d{3}Z$/, 'Z')
    return {
      timestamp,
      imageUrl: `/api/suvi/frames/${id}`,
      alt: `${selection.product.name} observada por ${observer} a las ${timestamp.slice(11, 16)} UTC`,
    }
  })

  return {
    query,
    instrument: { code: selection.instrument.code, name: selection.instrument.name },
    product: { code: selection.product.code, name: selection.product.name },
    parameter,
    origin: {
      kind: 'observed',
      provider: 'CITIC-UCR — archivo SUVI de NOAA',
      notice:
        'Representaciones ilustrativas de imágenes SUVI nivel 1b catalogadas por CITIC-UCR. Se excluyen las imágenes marcadas por contaminación o eclipse.',
      ...(satelliteId ? { satellite: satelliteId } : {}),
    },
    visualization: 'image-sequence',
    images,
  }
}
