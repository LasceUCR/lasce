/**
 * Serialises every job payload schema to JSON Schema under `schema/`.
 *
 * Those files are committed on purpose: they are the handshake between the
 * TypeScript producer and the Python consumer. `apps/worker` validates its
 * Pydantic models against them in `tests/test_contracts.py`, so a contract
 * changed on one side and not the other fails the test suite.
 *
 * Usage: `pnpm contracts:export` (from the repository root).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import { jobPayloads } from '../src/jobs'

const here = dirname(fileURLToPath(import.meta.url))
const outputDir = join(here, '..', 'schema')

mkdirSync(outputDir, { recursive: true })

for (const [jobName, schema] of Object.entries(jobPayloads)) {
  // `io: 'output'` on purpose: the producer runs `schema.parse()` before adding
  // the job, so what lands in Redis already has every default applied. The
  // worker therefore sees the output shape, not the input one.
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'output',
  })

  const document = {
    $id: `https://lasce.local/schema/jobs/${jobName}.json`,
    title: jobName,
    ...jsonSchema,
  }

  const file = join(outputDir, `${jobName}.json`)
  writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`)
  console.log(`wrote schema/${jobName}.json`)
}
