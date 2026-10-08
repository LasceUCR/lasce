import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { createPublication, getPublications, publicationCreateSchema } from '@/app/lib/publications'

import { writeFailure } from './http'

export const dynamic = 'force-dynamic'

/** Public list, in the language of the request's `lasce_locale` cookie. Never editing data. */
export async function GET(): Promise<NextResponse> {
  const publications = await getPublications(resolveLocale(await getLocale()))

  return NextResponse.json(
    { publications },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

/**
 * Creates a publication. The body needs `content.es` and `content.en` in full; see
 * `publicationCreateSchema`. Answers 201 with the stored publication, including its
 * `editing.version`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = publicationCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await createPublication(parsed.data)
    if (!result.ok) return writeFailure(null, result)

    return ok({ publication: result.publication }, 201)
  } catch (error) {
    return internalError('No se pudo crear la publicación.', error)
  }
}
