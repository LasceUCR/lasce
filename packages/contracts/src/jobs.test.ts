import assert from 'node:assert/strict'
import { test } from 'node:test'

import { JOB_NAMES, isJobName, jobPayloads } from './jobs.js'

test('every job name has a payload schema', () => {
  for (const name of Object.values(JOB_NAMES)) {
    assert.ok(jobPayloads[name], `missing payload schema for "${name}"`)
  }
})

test('isJobName rejects unknown names', () => {
  assert.equal(isJobName(JOB_NAMES.dailyRollup), true)
  assert.equal(isJobName('not-a-job'), false)
})

test('process-file applies its content type default', () => {
  const parsed = jobPayloads[JOB_NAMES.processFile].parse({ objectKey: 'uploads/a.csv' })
  assert.equal(parsed.contentType, 'application/octet-stream')
})

test('ingest-readings requires ISO timestamps', () => {
  const result = jobPayloads[JOB_NAMES.ingestReadings].safeParse({
    deviceId: 'device-1',
    from: 'yesterday',
    to: '2026-01-01T00:00:00Z',
  })
  assert.equal(result.success, false)
})
