import { expect, test } from 'vitest'

import { JOB_NAMES, isJobName, jobPayloads } from './jobs'

test('every job name has a payload schema', () => {
  for (const name of Object.values(JOB_NAMES)) {
    expect(jobPayloads[name], `missing payload schema for "${name}"`).toBeDefined()
  }
})

test('isJobName rejects unknown names', () => {
  expect(isJobName(JOB_NAMES.ingestReadings)).toBe(true)
  expect(isJobName('not-a-job')).toBe(false)
})

test('ingest-readings requires ISO timestamps', () => {
  const result = jobPayloads[JOB_NAMES.ingestReadings].safeParse({
    deviceId: 'device-1',
    from: 'yesterday',
    to: '2026-01-01T00:00:00Z',
  })
  expect(result.success).toBe(false)
})
