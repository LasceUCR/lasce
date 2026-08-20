# @lasce/worker

The Python worker: it consumes the BullMQ queue that `apps/web` produces onto, and runs the
recurring processing. It is the only component that writes to InfluxDB and MinIO.

A Python process can consume a queue filled by TypeScript because the official
[`bullmq`](https://pypi.org/project/bullmq/) Python package is a port of the Node one and executes
the same Lua scripts against Redis. Nothing custom bridges the two.

## Running it

```bash
uv sync                 # first time only (or: pnpm worker:install)
pnpm worker:dev         # from the repository root
```

It reads the `.env` at the repository root, the same file the Next.js app uses.

## Layout

```
app/
├── main.py             # entry point: BullMQ Worker, dispatch, audit trail, graceful shutdown
├── registry.py         # job name -> (payload model, processor)
├── settings.py         # pydantic-settings over the root .env
├── models/jobs.py      # Pydantic mirrors of packages/contracts
├── clients/            # influx.py, storage.py (MinIO), db.py (SQLAlchemy)
├── db/models.py        # SQLAlchemy mirror of the Prisma schema
└── processors/         # one module per job
```

## Jobs

| Job | What it does |
| --- | --- |
| `ingest-readings` | Pulls a window of readings for a device, writes points to InfluxDB, archives the raw CSV to MinIO |
| `process-file` | Reads an object from MinIO, summarises it, writes the summary back and records a row in PostgreSQL |
| `daily-rollup` | Scheduled: aggregates a day of readings from InfluxDB into `daily_rollups` in PostgreSQL |

`ingest-readings` synthesises its data — there is no upstream system in the scaffold. Replace
`_fetch_readings` in `app/processors/ingest_readings.py` with the real source; everything around it
stays.

## Adding a job

See [`docs/add-a-job.md`](../../docs/add-a-job.md). The short version: declare the contract in
`packages/contracts`, run `pnpm contracts:export`, add the Pydantic model and the processor here,
and register it in `app/registry.py`.

## Why everything is async

BullMQ's Python worker runs on asyncio. The InfluxDB and MinIO SDKs are synchronous, so the client
wrappers in `app/clients/` push their calls onto threads — a slow write would otherwise stall every
other job the worker is running concurrently. PostgreSQL uses async SQLAlchemy over psycopg 3, so
it needs no such treatment.

## Commands

```bash
pnpm --filter @lasce/worker lint         # ruff check + format check
pnpm --filter @lasce/worker format       # ruff format
pnpm --filter @lasce/worker typecheck    # mypy (strict)
pnpm --filter @lasce/worker test         # pytest
```

These are also what `pnpm turbo lint typecheck test` runs from the root, so the Python side is
covered by the same commands as the TypeScript side.

The test suite needs no running services: `tests/conftest.py` sets the environment it needs, and
`tests/test_contracts.py` validates the Pydantic models against the JSON Schema exported from Zod.
