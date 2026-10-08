// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

/**
 * Guards what the shared content core may depend on. It is imported by Server Components, route
 * handlers and Client Components alike, so it cannot pull in Prisma, React or Next.js, and it
 * must not assume any real entity's fields or a particular pair of languages.
 */
const directory = fileURLToPath(new URL('.', import.meta.url))

const sources = readdirSync(directory)
  .filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'test-fixtures.ts',
  )
  .map((file) => ({ file, text: readFileSync(`${directory}/${file}`, 'utf8') }))

function importsOf(text: string): string[] {
  return [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '')
}

describe('shared content core boundaries', () => {
  test('finds the source files it guards', () => {
    expect(sources.map(({ file }) => file).sort()).toEqual([
      'definition.ts',
      'form.ts',
      'messages.ts',
      'resolve.ts',
      'review.ts',
    ])
  })

  test.each(sources)('$file imports only zod, the locale config and its siblings', ({ text }) => {
    for (const module of importsOf(text)) {
      expect(['zod', '@/app/lib/i18n/config'].includes(module) || module.startsWith('./')).toBe(
        true,
      )
    }
  })

  test.each(sources)('$file names no real entity or field', ({ text }) => {
    expect(text).not.toMatch(/title|abstract|publica|research|news|noticia/i)
  })

  test.each(sources)('$file names no locale code outside the language name records', ({ text }) => {
    expect(text).not.toMatch(/['"`](es|en)['"`]/)
  })
})
