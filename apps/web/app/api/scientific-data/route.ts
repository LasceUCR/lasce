import { NextResponse } from 'next/server'

import { scientificDataQuerySchema } from '@/app/lib/scientific-data'
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

  try {
    const result =
      parsed.data.source === 'GOES'
        ? await queryNoaaScientificData(parsed.data)
        : await queryMockScientificData(parsed.data)

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof ScientificDataUpstreamError) {
      console.error(`Scientific data upstream error: ${error.message}`)
      return NextResponse.json(
        {
          error:
            'El servicio de NOAA no está disponible en este momento. Inténtelo nuevamente más tarde.',
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    throw error
  }
}
