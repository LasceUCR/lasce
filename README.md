# lasce

A pnpm + Turborepo monorepo with two runtimes that share a queue: a **Next.js** application that
serves the UI and the API, and a **Python** worker that runs background processing and scheduled
jobs.

```
lasce/
├── apps/
│   ├── web/            Next.js 16 — UI + route handlers (produces jobs)
│   └── worker/         Python 3.13 — BullMQ consumer + scheduled processing
├── packages/
│   ├── contracts/      Zod schemas for job payloads, exported to JSON Schema
│   ├── config/         shared tsconfig + environment validation
│   ├── db/             Prisma schema, migrations and client
│   ├── eslint-config/  shared ESLint flat configs
│   ├── jobs/           BullMQ queue, typed enqueue, declarative schedules
│   └── types/          pure TypeScript types
├── infra/docker/       docker-compose + production Dockerfiles
├── docs/               architecture and how-to guides
├── turbo.json
└── pnpm-workspace.yaml
```

| Store           | Purpose                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| PostgreSQL      | Relational data. Schema owned by Prisma; the worker reads/writes it via SQLAlchemy |
| Redis           | Transport for the BullMQ queue shared by both runtimes                             |
| InfluxDB 3 Core | Time-series readings, written by the worker                                        |
| MinIO           | File storage (S3-compatible)                                                       |

Read [`docs/architecture.md`](docs/architecture.md) for how the pieces fit together,
[`docs/add-a-job.md`](docs/add-a-job.md) to add work to the queue,
[`docs/testing.md`](docs/testing.md) for where tests go and what gates them, and
[`docs/tests/component_testing.md`](docs/tests/component_testing.md) for how UI component tests
should be structured.

## Requirements

- Node.js 22+ and pnpm 10
- [uv](https://docs.astral.sh/uv/) for the Python worker
- Docker (optional — see [running without Docker](infra/docker/README.md#running-without-docker))

## Quickstart

```bash
cp .env.example .env

pnpm install                # workspace dependencies
pnpm worker:install         # uv sync for the Python worker

pnpm services:up            # PostgreSQL, Redis, InfluxDB, MinIO
pnpm db:migrate             # create the schema
pnpm --filter @lasce/db seed

pnpm dev                    # http://localhost:3000
pnpm worker:dev             # in a second terminal
```

Open http://localhost:3000 and enqueue the demo job. It travels through Redis to the Python
worker, which writes points to InfluxDB, archives a CSV to MinIO and records the run in
PostgreSQL — the page shows the status changing as it happens.

## Commands

| Command                                           | What it does                                            |
| ------------------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                                        | Next.js dev server                                      |
| `pnpm worker:dev`                                 | Python worker                                           |
| `pnpm build`                                      | Build every package                                     |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`      | Across TypeScript **and** Python                        |
| `pnpm db:migrate` / `pnpm db:studio`              | Prisma migrations / Prisma Studio                       |
| `pnpm contracts:export`                           | Regenerate the JSON Schema the worker validates against |
| `pnpm jobs:register`                              | Sync the declared schedules into BullMQ                 |
| `pnpm services:up` / `:down` / `:logs` / `:reset` | Docker Compose stack                                    |

The worker is wired into Turborepo through a thin `package.json` that shells out to `uv`, so
`pnpm lint typecheck test` covers `ruff`, `mypy` and `pytest` as well.

## Jobs and scheduling

Job payloads are defined once, in [`packages/contracts`](packages/contracts), and exported to JSON
Schema. The worker mirrors them as Pydantic models and its test suite validates those models
against the exported schema — so a contract changed on one side and not the other fails the build
instead of failing at 3 a.m.

Recurring jobs are **declared** in `packages/jobs/src/schedules.ts`. How they fire is a separate,
still-open decision, and both options are wired up:

| Mechanism        | How                                                                       | Fits                                            |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| BullMQ scheduler | `pnpm jobs:register` writes the repeatable entries into Redis             | A long-running deployment                       |
| External cron    | `POST /api/jobs/[name]/trigger` with `Authorization: Bearer $CRON_SECRET` | Vercel Cron, GitHub Actions, Kubernetes CronJob |

Switching between them changes nothing in the processors.

```bash
curl -X POST http://localhost:3000/api/jobs/daily-rollup/trigger \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Environment

All processes read the single `.env` at the repository root. It is validated twice — by
`packages/config/src/env.ts` on the TypeScript side and `apps/worker/app/settings.py` on the Python
side — so a missing variable produces one readable error instead of a crash deep inside a request.
`.env.example` documents every variable.
