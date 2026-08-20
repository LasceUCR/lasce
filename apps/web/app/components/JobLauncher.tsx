'use client'

import { JOB_NAMES } from '@lasce/contracts'
import type { JobStatus } from '@lasce/types'
import { useCallback, useEffect, useState } from 'react'

import { enqueueJob } from '../actions'

interface Props {
  devices: { id: string; externalId: string; name: string }[]
}

/**
 * Enqueues an `ingest-readings` job and polls its status until it settles.
 * This is the end-to-end smoke test of the whole scaffold: Next.js puts a job on
 * Redis, the Python worker picks it up, and the state reported here changes.
 */
export function JobLauncher({ devices }: Props) {
  const [deviceId, setDeviceId] = useState(devices[0]?.externalId ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)

  const submit = useCallback(async () => {
    setPending(true)
    setError(null)
    setStatus(null)

    const to = new Date()
    const from = new Date(to.getTime() - 60 * 60 * 1000)

    const result = await enqueueJob(JOB_NAMES.ingestReadings, {
      deviceId,
      from: from.toISOString(),
      to: to.toISOString(),
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setJobId(result.jobId)
  }, [deviceId])

  useEffect(() => {
    if (!jobId) return

    let cancelled = false

    const poll = async () => {
      const response = await fetch(`/api/jobs/status/${jobId}`, { cache: 'no-store' })
      if (!response.ok || cancelled) return

      const next = (await response.json()) as JobStatus
      if (cancelled) return

      setStatus(next)

      // Stop polling once the job reaches a terminal state.
      if (next.state === 'completed' || next.state === 'failed') {
        clearInterval(timer)
      }
    }

    const timer = setInterval(poll, 1000)
    void poll()

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [jobId])

  if (devices.length === 0) {
    return (
      <p className="empty">
        No devices yet. Run <code>pnpm --filter @lasce/db seed</code> to insert the demo ones.
      </p>
    )
  }

  return (
    <div>
      <div className="row">
        <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
          {devices.map((device) => (
            <option key={device.id} value={device.externalId}>
              {device.name} ({device.externalId})
            </option>
          ))}
        </select>
        <button onClick={submit} disabled={pending}>
          {pending ? 'Enqueueing…' : 'Enqueue ingest-readings'}
        </button>
      </div>

      {error ? <p className="state-failed">{error}</p> : null}

      {jobId ? (
        <p className="muted">
          Job <code>{jobId}</code> —{' '}
          <strong className={status ? `state-${status.state}` : undefined}>
            {status?.state ?? 'waiting for the worker…'}
          </strong>
          {status?.failedReason ? ` — ${status.failedReason}` : null}
        </p>
      ) : null}

      {status?.state === 'completed' ? (
        <pre>
          <code>{JSON.stringify(status.returnValue, null, 2)}</code>
        </pre>
      ) : null}
    </div>
  )
}
