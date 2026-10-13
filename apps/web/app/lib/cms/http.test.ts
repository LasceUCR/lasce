import { afterEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import {
  conflict,
  duplicate,
  errorResponse,
  internalError,
  invalidBody,
  invalidId,
  isUuid,
  issuesOf,
  notFound,
  ok,
  readJson,
  reviewRequired,
} from './http'

afterEach(() => {
  vi.restoreAllMocks()
})

async function read(response: Response) {
  return {
    status: response.status,
    cache: response.headers.get('Cache-Control'),
    body: await response.json(),
  }
}

const schema = z.strictObject({
  content: z.strictObject({
    es: z.strictObject({ name: z.string().min(1, 'Nombre obligatorio.') }),
  }),
  tags: z.array(z.string()),
})

describe('responses', () => {
  test('errors carry a message, a code and any extra fields, never cached', async () => {
    expect(await read(errorResponse(418, 'teapot', 'Soy una tetera.', { hint: 1 }))).toEqual({
      status: 418,
      cache: 'no-store',
      body: { error: 'Soy una tetera.', code: 'teapot', hint: 1 },
    })
  })

  test('success bodies are never cached either', async () => {
    expect(await read(ok({ item: 1 }, 201))).toEqual({
      status: 201,
      cache: 'no-store',
      body: { item: 1 },
    })
    expect((await read(ok({}))).status).toBe(200)
  })

  test.each([
    [invalidId('Id no válido.'), 400, 'invalid-id', 'Id no válido.'],
    [notFound('No existe.'), 404, 'not-found', 'No existe.'],
    [conflict('Cambió.'), 409, 'conflict', 'Cambió.'],
    [duplicate('duplicate-slug', 'Ya existe.'), 409, 'duplicate-slug', 'Ya existe.'],
  ])('maps a common failure to its status and code', async (response, status, code, error) => {
    expect(await read(response)).toMatchObject({ status, body: { error, code } })
  })

  test('review-required lists each pending field at its content path', async () => {
    expect(
      await read(
        reviewRequired([
          { locale: 'es', field: 'name' },
          { locale: 'en', field: 'summary' },
        ]),
      ),
    ).toEqual({
      status: 400,
      cache: 'no-store',
      body: {
        error:
          'Cambió un campo en un solo idioma. Actualice el campo equivalente en el otro idioma o confirme que sigue siendo correcto.',
        code: 'review-required',
        pending: [
          { path: 'content.es.name', locale: 'es', field: 'name' },
          { path: 'content.en.summary', locale: 'en', field: 'summary' },
        ],
      },
    })
  })

  test('an internal error is logged but none of its details reach the body', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('relation "research.secret" does not exist')

    const { status, body } = await read(internalError('No se pudo guardar.', failure))

    expect(status).toBe(500)
    expect(body).toEqual({ error: 'No se pudo guardar.', code: 'internal-error' })
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(log).toHaveBeenCalledWith('No se pudo guardar.:', failure)
  })
})

describe('validation issues', () => {
  test('report the full dotted path of nested fields and array items', () => {
    const result = schema.safeParse({ content: { es: { name: '' } }, tags: ['a', 3] })

    expect(issuesOf(result.error!)).toEqual([
      { path: 'content.es.name', message: 'Nombre obligatorio.' },
      { path: 'tags.1', message: expect.any(String) },
    ])
  })

  test('report each unknown key at its own path', () => {
    const result = schema.safeParse({ content: { es: { name: 'x' }, fr: {} }, tags: [], extra: 1 })

    expect(issuesOf(result.error!)).toEqual([
      { path: 'content.fr', message: 'Campo no permitido: fr.' },
      { path: 'extra', message: 'Campo no permitido: extra.' },
    ])
  })

  test('invalid-body carries those issues', async () => {
    const result = schema.safeParse({})

    expect(await read(invalidBody(result.error!))).toMatchObject({
      status: 400,
      body: {
        error: 'Faltan campos obligatorios o no son válidos.',
        code: 'invalid-body',
        issues: [
          { path: 'content', message: expect.any(String) },
          { path: 'tags', message: expect.any(String) },
        ],
      },
    })
  })
})

describe('readJson', () => {
  function post(body: string) {
    return new Request('http://localhost/api', { method: 'POST', body })
  }

  test('returns the parsed body', async () => {
    expect(await readJson(post('{"a":[1,2]}'))).toEqual({ ok: true, body: { a: [1, 2] } })
    expect(await readJson(post('null'))).toEqual({ ok: true, body: null })
  })

  test.each(['{"a":', '', 'not json', "{'a':1}"])(
    'answers invalid-json for a malformed body: %j',
    async (body) => {
      const result = await readJson(post(body))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(await read(result.response)).toEqual({
        status: 400,
        cache: 'no-store',
        body: { error: 'El cuerpo de la solicitud no es JSON válido.', code: 'invalid-json' },
      })
    },
  )
})

describe('isUuid', () => {
  test('accepts a UUID in either case', () => {
    expect(isUuid('7d0c2a62-1d84-4a4e-9d64-4c5b1f2a9e10')).toBe(true)
    expect(isUuid('7D0C2A62-1D84-4A4E-9D64-4C5B1F2A9E10')).toBe(true)
  })

  test.each(['', 'p-1', '1', '7d0c2a62-1d84-4a4e-9d64-4c5b1f2a9e1', "' or 1=1 --", '../etc'])(
    'rejects %j',
    (id) => {
      expect(isUuid(id)).toBe(false)
    },
  )
})
