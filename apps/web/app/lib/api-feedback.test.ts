import { describe, expect, test } from 'vitest'

import { readFailureReason } from './api-feedback'

function jsonBody(body: unknown) {
  return { json: async () => body }
}

describe('readFailureReason', () => {
  test('returns the error the route handler gave', async () => {
    expect(await readFailureReason(jsonBody({ error: 'No ha iniciado sesión.' }))).toBe(
      'No ha iniciado sesión.',
    )
  })

  test('appends every field message from a validation failure', async () => {
    const reason = await readFailureReason(
      jsonBody({
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: {
          title: ['El título es obligatorio.'],
          description: ['El texto es obligatorio.'],
        },
      }),
    )

    expect(reason).toBe(
      'Faltan campos obligatorios o no son válidos: El título es obligatorio. El texto es obligatorio.',
    )
  })

  test('lists a repeated field message only once', async () => {
    const reason = await readFailureReason(
      jsonBody({
        error: 'Datos no válidos.',
        issues: { title: ['Revise el campo.'], description: ['Revise el campo.'] },
      }),
    )

    expect(reason).toBe('Datos no válidos: Revise el campo.')
  })

  test('uses the field messages alone when there is no error', async () => {
    expect(
      await readFailureReason(jsonBody({ issues: { title: ['El título es obligatorio.'] } })),
    ).toBe('El título es obligatorio.')
  })

  test('ignores issues that are not lists of messages', async () => {
    expect(
      await readFailureReason(
        jsonBody({ error: 'Datos no válidos.', issues: { title: 'x', icon: [3] } }),
      ),
    ).toBe('Datos no válidos.')
  })

  test('returns null when the body is not JSON', async () => {
    const response = {
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    }

    expect(await readFailureReason(response)).toBeNull()
  })

  test.each([[null], ['texto'], [{}], [{ error: '   ' }]])(
    'returns null when the body gives no reason: %j',
    async (body) => {
      expect(await readFailureReason(jsonBody(body))).toBeNull()
    },
  )
})
