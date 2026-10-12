// @vitest-environment node

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

/**
 * `version.ts` and `save.ts` are imported by editors that run in the browser, so they must not
 * pull in server code. `http.ts` and `transaction.ts` are the server half and may.
 */
const directory = fileURLToPath(new URL('.', import.meta.url))

function importsOf(file: string): string[] {
  const text = readFileSync(`${directory}/${file}`, 'utf8')
  return [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '')
}

describe('cms helper boundaries', () => {
  test.each(['version.ts', 'save.ts'])('%s imports nothing from the server', (file) => {
    for (const module of importsOf(file)) {
      expect(module).not.toMatch(/^(next\/server|next\/headers|@lasce\/db|@prisma|node:)/)
      expect(module).not.toMatch(/\.\/(http|transaction)$/)
    }
  })

  test('no helper knows about a particular entity', () => {
    for (const file of ['http.ts', 'save.ts', 'transaction.ts', 'version.ts']) {
      const text = readFileSync(`${directory}/${file}`, 'utf8')
      expect(text).not.toMatch(/publicaci|research|news|noticia|doi|external_url/i)
    }
  })
})
