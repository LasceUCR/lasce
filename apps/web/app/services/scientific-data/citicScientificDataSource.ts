import { createHash } from 'node:crypto'

import { JOB_NAMES, queryGoesArchivePayload } from '@lasce/contracts'
import { enqueue, getJobStatus, getQueue } from '@lasce/jobs'
import { z } from 'zod'

import {
  findScientificProduct,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'
import { ScientificDataUpstreamError } from './noaaScientificDataSource'

const archiveResultSchema = z.object({
  query: queryGoesArchivePayload,
  points: z.array(z.object({ timestamp: z.iso.datetime(), value: z.number().finite() })).max(360),
  satellite: z.number().int().nullable(),
  sampled: z.boolean(),
})

export interface PendingArchiveQuery {
  state: 'pending'
  jobId: string
  progress: number
}

export async function queryCiticScientificData(
  query: ScientificDataQuery,
  requestedJobId?: string,
): Promise<TimeSeriesDataResult | PendingArchiveQuery> {
  const selection = findScientificProduct(query.source, query.product)
  if (query.source !== 'GOES' || !selection || selection.product.visualization !== 'time-series') {
    throw new Error('The CITIC archive only accepts GOES time series')
  }
  const payload = queryGoesArchivePayload.parse(query)
  const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const prefix = `goes-v1-${fingerprint}-`
  const today = new Date().toISOString().slice(0, 10)
  const suffix = query.date === today ? Math.floor(Date.now() / 600_000).toString() : 'archive'
  const jobId = requestedJobId ?? `${prefix}${suffix}`
  if (!jobId.startsWith(prefix) || !/^(archive|\d{1,12})$/.test(jobId.slice(prefix.length))) {
    throw new ScientificDataUpstreamError('La consulta histórica no corresponde a estos criterios.')
  }

  try {
    let status = await getJobStatus(jobId)
    if (status && status.name !== JOB_NAMES.queryGoesArchive) {
      throw new Error('Unexpected archive job type')
    }
    if (status?.state === 'failed') {
      if (requestedJobId) throw new Error('Historical query failed')
      const job = await getQueue().getJob(jobId)
      if (!job) throw new Error('Historical query expired')
      await job.retry()
      status = null
    }
    if (!status) {
      if (requestedJobId) throw new Error('Historical query expired')
      await enqueue(JOB_NAMES.queryGoesArchive, payload, { jobId })
    }
    if (status?.state !== 'completed') {
      return { state: 'pending', jobId, progress: status?.progress ?? 0 }
    }
    const result = archiveResultSchema.parse(status.returnValue)
    if (JSON.stringify(result.query) !== JSON.stringify(payload)) {
      throw new Error('Historical result does not match the query')
    }
    return {
      query,
      instrument: { code: selection.instrument.code, name: selection.instrument.name },
      product: { code: selection.product.code, name: selection.product.name },
      parameter: selection.product.parameters.find(
        (parameter) => parameter.code === query.parameter,
      )!,
      visualization: 'time-series',
      points: result.points,
      origin: {
        kind: 'observed',
        provider: 'CITIC-UCR — archivo histórico GOES de NOAA',
        notice:
          'Observaciones históricas del archivo GOES nivel 1b de CITIC-UCR. Se excluyen valores de relleno y observaciones marcadas con calidad degradada o inválida.' +
          (result.sampled
            ? ' Se muestran 360 observaciones distribuidas uniformemente en el intervalo; no se interpolaron valores.'
            : ''),
        ...(result.satellite ? { satellite: result.satellite } : {}),
      },
    }
  } catch (error) {
    if (error instanceof ScientificDataUpstreamError) throw error
    throw new ScientificDataUpstreamError('No fue posible procesar la consulta histórica de CITIC.')
  }
}
