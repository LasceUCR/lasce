import { NextResponse } from 'next/server'

import { requireAdmin } from '@/app/lib/auth/apiGuard'
import { createPublication, getPublications, publicationInputSchema } from '@/app/lib/publications'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const publications = await getPublications()

  return NextResponse.json(
    { publications },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400 },
    )
  }

  const parsed = publicationInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  try {
    const publication = await createPublication(parsed.data)

    return NextResponse.json(
      { publication },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch {
    return NextResponse.json({ error: 'No se pudo crear la publicación.' }, { status: 500 })
  }
}
