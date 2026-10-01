import { NextResponse } from 'next/server'

import { scientificDataQuerySchema } from '@/app/lib/scientific-data'
import { getAvailabilityMessage, getSuviAvailability } from '@/app/lib/scientific-data-availability'
import { scientificDataSources } from '@/app/services/scientific-data'
import {
  ScientificDataUpstreamError,
  UnsupportedScientificQueryError,
} from '@/app/services/scientific-data/errors'

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
    const result = await scientificDataSources.query({
      query: parsed.data,
      jobId: searchParams.get('jobId') ?? undefined,
    })

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

    if (error instanceof UnsupportedScientificQueryError) {
      console.error(`Scientific data wiring error: ${error.message}`)
      return NextResponse.json(
        { error: 'La fuente científica no está disponible en este momento.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    throw error
  }
}
