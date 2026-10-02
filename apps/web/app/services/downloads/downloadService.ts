import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'

import type { Permission } from '@/app/lib/auth/permissions'
import {
  DOWNLOAD_FORMAT_DEFINITIONS,
  DOWNLOAD_LINK_TTL_SECONDS,
  type DownloadFormat,
} from '@/app/lib/downloads/formats'
import type {
  ScientificDataQuery,
  ScientificDataResult,
  ScientificInstrumentCode,
} from '@/app/lib/scientific-data'
import { UnsupportedScientificQueryError } from '@/app/services/scientific-data/errors'

import { validateResourceDownload, type DownloadAccessDenied } from './downloadAccess'
import { storeDownload } from './downloadStorage'
import { EXPORTERS } from './exporters'
import { findDownloadLoader } from './loaders'

export type ResourceDownloadResult =
  | { ok: true; url: string; filename: string; expiresAt: string }
  | DownloadAccessDenied
  | { ok: false; reason: 'pending' | 'empty'; message: string }

const PENDING: ResourceDownloadResult = {
  ok: false,
  reason: 'pending',
  message:
    'La consulta todavía se está procesando. Espere a que termine e intente la descarga nuevamente.',
}

const EMPTY: ResourceDownloadResult = {
  ok: false,
  reason: 'empty',
  message: 'No hay datos para descargar con los criterios seleccionados.',
}

function hasRows(result: ScientificDataResult) {
  switch (result.visualization) {
    case 'time-series':
      return result.points.length > 0
    case 'dynamic-spectrum':
      return result.cells.length > 0
    case 'image-sequence':
      return result.images.length > 0
  }
}

/** `GOES_EXIS_SFXR_0.1-0.8nm_2026-09-30_0000-2359.csv`: ASCII only, safe in a header. */
export function downloadFilename(
  query: ScientificDataQuery,
  instrument: ScientificInstrumentCode,
  format: DownloadFormat,
) {
  const parts = [
    query.source,
    instrument,
    query.product,
    query.parameter,
    query.date,
    `${query.startTime}-${query.endTime}`.replaceAll(':', ''),
  ]
  const stem = parts.map((part) => part.replace(/[^A-Za-z0-9.-]+/g, '-')).join('_')
  return `${stem}.${DOWNLOAD_FORMAT_DEFINITIONS[format].extension}`
}

export interface CreateResourceDownloadInput {
  userId: string
  grants: Iterable<Permission>
  request: unknown
  now?: Date
}

/**
 * Produces one download: validates access (`validateResourceDownload`), reads the data, renders the file, stores it in the
 * private downloads bucket and records it in `resource_downloads`. The link is returned only once
 * the row is written, so every link handed out is in the audit table.
 *
 * Upstream failures (`ScientificDataUpstreamError`) and storage/database errors propagate; the
 * Server Action turns them into a message.
 */
export async function createResourceDownload({
  userId,
  grants,
  request,
  now = new Date(),
}: CreateResourceDownloadInput): Promise<ResourceDownloadResult> {
  const access = validateResourceDownload(request, grants, now)
  if (!access.ok) return access
  const { query, format, jobId, instrument } = access

  const loader = findDownloadLoader(query.source, instrument, format)
  if (!loader) {
    throw new UnsupportedScientificQueryError(
      `No download loader for ${query.source}/${instrument}/${format}`,
    )
  }

  const response = await loader({ query, ...(jobId ? { jobId } : {}) })
  if ('state' in response) return PENDING
  if (!hasRows(response)) return EMPTY

  const definition = DOWNLOAD_FORMAT_DEFINITIONS[format]
  const file = await EXPORTERS[format].export(response)
  const objectKey = [
    query.source,
    instrument,
    now.toISOString().slice(0, 10),
    `${randomUUID()}.${definition.extension}`,
  ].join('/')
  const filename = downloadFilename(query, instrument, format)
  const url = await storeDownload(objectKey, file.body, definition.contentType, filename)
  const expiresAt = new Date(now.getTime() + DOWNLOAD_LINK_TTL_SECONDS * 1000)

  await prisma.resourceDownload.create({
    data: {
      userId,
      source: query.source,
      instrument: instrument,
      product: query.product,
      format,
      params: {
        parameter: query.parameter,
        date: query.date,
        startTime: query.startTime,
        endTime: query.endTime,
      },
      objectKey,
      byteSize: file.body.length,
      rowCount: file.rowCount,
      expiresAt,
    },
  })

  return { ok: true, url, filename, expiresAt: expiresAt.toISOString() }
}
