import { prisma } from '@lasce/db'

import { JobLauncher } from './components/JobLauncher'

// Always render fresh: this page reflects queue and database state.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [devices, jobRuns, rollups] = await Promise.all([
    prisma.device.findMany({ orderBy: { externalId: 'asc' } }),
    prisma.jobRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 }),
    prisma.dailyRollup.findMany({
      orderBy: { date: 'desc' },
      take: 5,
      include: { device: true },
    }),
  ])

  return (
    <main>
      <header>
        <h1>lasce</h1>
        <p className="muted">
          Next.js produces jobs onto a BullMQ queue in Redis; the Python worker consumes them and
          writes to PostgreSQL, InfluxDB and MinIO.
        </p>
      </header>

      <section>
        <h2>Run a job end to end</h2>
        <JobLauncher
          devices={devices.map((device) => ({
            id: device.id,
            externalId: device.externalId,
            name: device.name,
          }))}
        />
      </section>

      <section>
        <h2>Recent job runs</h2>
        {jobRuns.length === 0 ? (
          <p className="empty">
            Nothing yet. Enqueue a job above with the worker running (<code>pnpm worker:dev</code>).
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {jobRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <code>{run.name}</code>
                  </td>
                  <td className={run.status === 'FAILED' ? 'state-failed' : 'state-completed'}>
                    {run.status}
                  </td>
                  <td className="muted">{run.startedAt.toISOString().replace('T', ' ').slice(0, 19)}</td>
                  <td className="muted">{run.durationMs ? `${run.durationMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Latest daily rollups</h2>
        {rollups.length === 0 ? (
          <p className="empty">
            Written by the <code>daily-rollup</code> cron job. Trigger it manually with{' '}
            <code>curl -X POST localhost:3000/api/jobs/daily-rollup/trigger -H &quot;Authorization: Bearer $CRON_SECRET&quot;</code>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Date</th>
                <th>Readings</th>
                <th>Avg</th>
                <th>Min / Max</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((rollup) => (
                <tr key={rollup.id}>
                  <td>{rollup.device.name}</td>
                  <td className="muted">{rollup.date.toISOString().slice(0, 10)}</td>
                  <td>{rollup.count}</td>
                  <td>{rollup.avgValue.toFixed(2)}</td>
                  <td className="muted">
                    {rollup.minValue.toFixed(2)} / {rollup.maxValue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
