# Architecture

Two runtimes, one queue.

```
                        ┌───────────────────────────────┐
   browser ────────────▶│  apps/web  (Next.js 16)       │
                        │  UI + route handlers          │
                        │  producer only                │
                        └───────────┬───────────────────┘
                                    │ enqueue()  (BullMQ, TypeScript)
                                    ▼
                        ┌───────────────────────────────┐
   external cron ──────▶│  Redis — queue "lasce"        │
   POST /api/jobs/…     └───────────┬───────────────────┘
                                    │ consume  (BullMQ, Python)
                                    ▼
                        ┌───────────────────────────────┐
                        │  apps/worker  (Python 3.13)   │
                        │  processors + scheduled work  │
                        └──┬─────────────┬──────────┬───┘
                           │             │          │
                           ▼             ▼          ▼
                     PostgreSQL      InfluxDB     MinIO
                     (relational)   (time series) (files)
```

## Why a Python worker can read a TypeScript queue

The official [`bullmq`](https://pypi.org/project/bullmq/) Python package is a port of the Node
library, and both execute the same Lua scripts inside Redis. The queue is not a JSON convention the
two sides agreed on — it is literally the same data structures and the same atomic operations. That
is what makes a TypeScript producer and a Python consumer viable without a translation service in
between.

What is _not_ automatic is the shape of a payload, which is why
[`packages/contracts`](../packages/contracts) exists and exports JSON Schema for the Python side to
check itself against.

## Who owns what

| Store      | Written by                                      | Read by                   | Schema owner                           |
| ---------- | ----------------------------------------------- | ------------------------- | -------------------------------------- |
| PostgreSQL | `apps/web` (Prisma), `apps/worker` (SQLAlchemy) | both                      | **Prisma** — the only migration source |
| InfluxDB   | `apps/worker`                                   | `apps/worker`             | schema-on-write                        |
| MinIO      | `apps/worker`, `apps/web`                       | `apps/worker`, `apps/web` | —                                      |
| Redis      | `apps/web` enqueues, `apps/worker` consumes     | both                      | BullMQ                                 |

The worker owns `readings/<deviceId>/<date>.csv` and its derived `.summary.json` siblings.
`apps/web`'s side (`apps/web/app/services/storage`) is a **service layer with no caller yet**, and
is not finished: it writes keys of the form `<timestamp>_<filename>` at the bucket root, with no
`assets/` prefix and no guard keeping it out of `readings/`. Its uploads are ordinary server-side
`putObject` calls, so the file passes through Next rather than going browser → MinIO directly.
See [manage-assets.md](manage-assets.md#known-gaps) before building on it.

One owner per schema is deliberate. The worker reads and writes the same PostgreSQL tables through
SQLAlchemy but never migrates them, so there is only ever one migration history.

Two consequences of that split are worth knowing before you touch the schema:

- Ids default to `gen_random_uuid()` in PostgreSQL rather than Prisma's `cuid()`, which is generated
  inside the Prisma client and would leave the worker unable to insert a row.
- `@updatedAt` is likewise applied by the Prisma client, so those columns also carry
  `@default(now())` and the worker sets them explicitly.

## Where a job comes from

Three entry points, one code path:

1. **The UI** — a Server Action in `apps/web/app/actions.ts`.
2. **HTTP** — `POST /api/jobs/[name]/trigger`, guarded by `CRON_SECRET`. This is what an external
   cron (Vercel Cron, GitHub Actions, a Kubernetes CronJob) calls.
3. **BullMQ's scheduler** — the repeatable entries written by `pnpm jobs:register`.

All three end up in `enqueue()` from `@lasce/jobs`, which validates against the contract before
anything reaches Redis. The worker cannot tell them apart, and does not need to.

The scheduling mechanism was left deliberately swappable because the deployment target is not
settled yet: schedules are _declared_ in `packages/jobs/src/schedules.ts` regardless, and only the
mechanism that reads that list changes.

## Request path of a job

1. `enqueue(name, payload)` validates the payload with the Zod contract and adds it to Redis.
2. The worker's `process()` in `apps/worker/app/main.py` looks the name up in `registry.py`.
   An unknown name raises `UnknownJobError` immediately — a job nobody handles must not sit in the
   queue looking healthy.
3. The payload is re-validated by the matching Pydantic model.
4. A `job_runs` row is written (`RUNNING`), the processor executes, the row is updated
   (`COMPLETED` / `FAILED`). Bookkeeping failures are logged, never raised — they must not sink the
   job they describe.
5. On error the exception is re-raised so BullMQ applies the retry policy from `defaultJobOptions`.

## Threading model

The BullMQ worker runs on asyncio. PostgreSQL access is async throughout (SQLAlchemy over
psycopg 3). The InfluxDB and MinIO SDKs are synchronous, so the wrappers in `apps/worker/app/clients/`
push their calls onto threads — otherwise a slow write would stall every other job the process is
handling concurrently.

## Testing

`apps/web` runs Vitest with React Testing Library and jsdom; see
[`docs/tests/component_testing.md`](tests/component_testing.md). UI component tests sit beside
their component and mock the Server Action / `fetch` boundary while exercising `@lasce/contracts`
for real. Service-layer tests sit under `apps/web/tests/unit/` instead, mocking the SDK at the
module boundary — `tests/unit/services/storage/MinioAssetStorage.test.ts` mocks `minio` that way.
Playwright owns `apps/web/tests/e2e` and runs separately under `test:e2e`.
Three suites, each a required check on every Pull Request: Vitest for TypeScript units,
Playwright for end-to-end, and pytest for the Python worker. TypeScript tests are colocated with
the code they cover; Playwright and pytest live in their own `tests/` directory.
[`docs/testing.md`](testing.md) has the placement rules, the coverage floors and what each CI job
runs.

`apps/web` UI components additionally follow the structure in
[`docs/tests/component_testing.md`](tests/component_testing.md): Vitest + React Testing Library,
tests colocated with the component, and the Server Action / `fetch` boundary mocked while
`@lasce/contracts` is exercised for real.
