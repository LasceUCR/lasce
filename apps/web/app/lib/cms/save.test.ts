import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  accessFailure,
  FIELDS_MESSAGE,
  invalidBodyFailure,
  parseApiError,
  reviewRequiredFailure,
  SAVE_ERROR_MESSAGE,
  sendJson,
  unexpectedFailure,
} from './save'

const fetchMock = vi.fn()

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function stubFetch() {
  vi.stubGlobal('fetch', fetchMock)
}

describe('sendJson', () => {
  test('sends the body as JSON and reads a JSON answer', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }))

    expect(await sendJson('/api/x', 'POST', { name: 'Taller' })).toEqual({
      ok: true,
      status: 201,
      body: { id: 1 },
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Taller"}',
    })
  })

  test('sends no body and no content type when there is no body', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    expect(await sendJson('/api/x/1', 'DELETE')).toEqual({ ok: true, status: 204, body: null })
    expect(fetchMock).toHaveBeenCalledWith('/api/x/1', { method: 'DELETE' })
  })

  test('reports a request that never got an answer as status 0', async () => {
    stubFetch()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    expect(await sendJson('/api/x', 'PATCH', {})).toEqual({ ok: false, status: 0, body: null })
  })

  test('reads an error answer that is not JSON as no body', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

    expect(await sendJson('/api/x', 'PATCH', {})).toEqual({ ok: false, status: 502, body: null })
  })

  test('keeps the JSON body of an error answer', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Cambió.', code: 'conflict' }), { status: 409 }),
    )

    expect(await sendJson('/api/x', 'PATCH', {})).toEqual({
      ok: false,
      status: 409,
      body: { error: 'Cambió.', code: 'conflict' },
    })
  })
})

describe('parseApiError', () => {
  test('reads the error envelope', () => {
    expect(
      parseApiError({
        error: 'Revise.',
        code: 'invalid-body',
        issues: [{ path: 'content.en.name', message: 'Obligatorio.' }],
        pending: [{ path: 'content.es.name', locale: 'es', field: 'name' }],
      }),
    ).toEqual({
      message: 'Revise.',
      code: 'invalid-body',
      issues: [{ path: 'content.en.name', message: 'Obligatorio.' }],
      pending: ['content.es.name'],
    })
  })

  test.each([null, undefined, 'texto', 42, [], {}])('copes with a body like %j', (body) => {
    expect(parseApiError(body)).toEqual({ message: null, code: null, issues: [], pending: [] })
  })

  test('keeps only well-formed parts of a malformed body', () => {
    expect(
      parseApiError({
        error: 7,
        code: ['x'],
        issues: [null, 'x', { path: 3, message: 4 }, { path: 'a' }],
        pending: [{ path: 1 }, { path: 'content.en.name' }, 'content.es.name'],
      }),
    ).toEqual({
      message: null,
      code: null,
      issues: [
        { path: '', message: null },
        { path: 'a', message: null },
      ],
      pending: ['content.en.name'],
    })
  })
})

describe('failures', () => {
  const isFormField = (path: string) => path.startsWith('content.') || path === 'startsAt'

  test('invalid-body: issues under their fields, the rest above the form', () => {
    const error = parseApiError({
      code: 'invalid-body',
      issues: [
        { path: 'content.en.name', message: 'Primero.' },
        { path: 'content.en.name', message: 'Segundo.' },
        { path: 'startsAt' },
        { path: 'version', message: 'Versión requerida.' },
        { path: '', message: 'Cuerpo no válido.' },
      ],
    })

    expect(invalidBodyFailure(error, isFormField)).toEqual({
      message: 'Versión requerida. Cuerpo no válido.',
      fieldErrors: { 'content.en.name': 'Primero.', startsAt: FIELDS_MESSAGE },
      reopen: false,
    })
    expect(invalidBodyFailure(parseApiError({ code: 'invalid-body' }), isFormField).message).toBe(
      FIELDS_MESSAGE,
    )
  })

  test('review-required: the message, and the field message under each pending path', () => {
    const error = parseApiError({
      error: 'Cambió un campo en un solo idioma.',
      code: 'review-required',
      pending: [{ path: 'content.es.name' }, { path: 'content.en.summary' }],
    })

    expect(reviewRequiredFailure(error, 'Actualice o confirme.')).toEqual({
      message: 'Cambió un campo en un solo idioma.',
      fieldErrors: {
        'content.es.name': 'Actualice o confirme.',
        'content.en.summary': 'Actualice o confirme.',
      },
      reopen: false,
    })
    expect(reviewRequiredFailure(parseApiError({}), 'x').message).toBe(FIELDS_MESSAGE)
  })

  test('401 and 403 keep the form open, with the server message when there is one', () => {
    expect(accessFailure(401, parseApiError({ error: 'No ha iniciado sesión.' }))).toEqual({
      message:
        'No ha iniciado sesión. Inicie sesión de nuevo para guardar; sus cambios siguen en el formulario.',
      fieldErrors: {},
      reopen: false,
    })
    expect(accessFailure(401, parseApiError(null))?.message).toMatch(/^No ha iniciado sesión\./)
    expect(accessFailure(403, parseApiError(null))?.message).toBe(
      'No tiene permisos para modificar este contenido.',
    )
    expect(accessFailure(403, parseApiError({ error: 'Sin permiso.' }))?.message).toBe(
      'Sin permiso.',
    )
    expect(accessFailure(409, parseApiError(null))).toBeNull()
  })

  test('anything else shows the server message or a generic one', () => {
    expect(unexpectedFailure(parseApiError({ error: 'Falló.' }))).toEqual({
      message: 'Falló.',
      fieldErrors: {},
      reopen: false,
    })
    expect(unexpectedFailure(parseApiError(null)).message).toBe(SAVE_ERROR_MESSAGE)
  })
})
