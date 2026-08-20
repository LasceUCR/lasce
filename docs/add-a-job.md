# Adding a job

A job crosses a language boundary, so it touches both sides. The order below keeps the contract
ahead of the implementations, which is what makes the drift test meaningful.

Say you are adding `export-report`.

## 1. Declare the contract

`packages/contracts/src/jobs.ts`:

```ts
export const JOB_NAMES = {
  // …
  exportReport: 'export-report',
} as const

export const exportReportPayload = z.object({
  deviceId: z.string().min(1),
  format: z.enum(['csv', 'pdf']).default('csv'),
})

export const jobPayloads = {
  // …
  [JOB_NAMES.exportReport]: exportReportPayload,
} as const satisfies Record<JobName, z.ZodType>
```

The `satisfies` clause means TypeScript fails the build if you add a name without a schema.

## 2. Export the JSON Schema

```bash
pnpm contracts:export
```

This writes `packages/contracts/schema/export-report.json`. Commit it — it is the artefact the
Python side validates itself against.

## 3. Mirror the payload in Python

`apps/worker/app/models/jobs.py`:

```python
class ExportReportPayload(JobPayload):
    device_id: str = Field(min_length=1, alias="deviceId")
    format: str = "csv"
```

Use `alias=` for anything camelCase — the payload arrives exactly as the producer sent it.

## 4. Write the processor

`apps/worker/app/processors/export_report.py`:

```python
async def run(payload: ExportReportPayload, job: Any) -> dict[str, Any]:
    await job.updateProgress(50)
    ...
    return {"deviceId": payload.device_id}
```

The return value is stored by BullMQ and surfaces in `GET /api/jobs/status/[id]`, so return
something worth reading. Raise on failure — `main.py` records it and BullMQ handles the retry.

## 5. Register it

`apps/worker/app/registry.py`:

```python
REGISTRY = {
    # …
    "export-report": JobHandler(ExportReportPayload, export_report.run),
}
```

Add the module to `app/processors/__init__.py` as well.

## 6. Add the test example

`apps/worker/tests/test_contracts.py` keeps one example payload per job:

```python
EXAMPLES = {
    # …
    "export-report": {"deviceId": "device-001", "format": "csv"},
}
```

The suite asserts that the registry and the exported contracts describe the same set of jobs, so
forgetting either side fails here rather than in production.

## 7. Enqueue it

From TypeScript:

```ts
await enqueue(JOB_NAMES.exportReport, { deviceId: 'device-001', format: 'csv' })
```

Over HTTP:

```bash
curl -X POST http://localhost:3000/api/jobs/export-report/trigger \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"device-001"}'
```

## If it should run on a schedule

Add it to `packages/jobs/src/schedules.ts`:

```ts
export const schedules: Schedule[] = [
  // …
  { id: 'export-report-weekly', name: JOB_NAMES.exportReport, cron: '0 6 * * 1', data: { deviceId: 'device-001' } },
]
```

Then either `pnpm jobs:register` (BullMQ's own scheduler) or point your external cron at the
trigger route. The list is the same either way; only the thing reading it changes.

## Verify

```bash
pnpm turbo lint typecheck test
```

This runs ESLint and `tsc` over the TypeScript packages and `ruff`, `mypy` and `pytest` over the
worker — including the contract drift test.
