import { NextResponse } from 'next/server'

import { findScientificProduct, scientificDataQuerySchema } from '@/app/lib/scientific-data'
import { getAvailabilityMessage, getSuviAvailability } from '@/app/lib/scientific-data-availability'
import { queryCiticScientificData } from '@/app/services/scientific-data/citicScientificDataSource'
import { queryMockScientificData } from '@/app/services/scientific-data/mockScientificDataSource'
import {
  queryNoaaScientificData,
  ScientificDataUpstreamError,
} from '@/app/services/scientific-data/noaaScientificDataSource'

/**
 * Public read-only endpoint for scientific visualization. It intentionally has
 * no authentication requirement and exposes no download operation.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const searchParams = new URL(request.url).searchParams
  const parsed = scientificDataQuerySchema.safeParse({
    source: searchParams.get('source'),
    product: searchParams.get('product'),
    parameter: searchParams.get('parameter'),
    date: searchParams.get('date'),
    startTime: searchParams.get('startTime'),
    endTime: searchParams.get('endTime'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Los criterios de consulta no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const availabilityMessage = getAvailabilityMessage(parsed.data, getSuviAvailability())
  if (availabilityMessage) {
    return NextResponse.json(
      { error: availabilityMessage },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const result =
      parsed.data.source === 'GOES'
        ? findScientificProduct('GOES', parsed.data.product)?.product.visualization ===
          'image-sequence'
          ? await queryNoaaScientificData(parsed.data)
          : await queryCiticScientificData(parsed.data, searchParams.get('jobId') ?? undefined)
        : await queryMockScientificData(parsed.data)

    return NextResponse.json(result, {
      status: 'state' in result ? 202 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof ScientificDataUpstreamError) {
      console.error(`Scientific data upstream error: ${error.message}`)
      return NextResponse.json(
        {
          error: 'No fue posible consultar la fuente científica. Inténtelo nuevamente más tarde.',
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    throw error
  }
}
