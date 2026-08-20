# @lasce/web

The Next.js application: user interface **and** HTTP API in one App Router app. It is the producer
side of the queue — it never processes a job itself, it only enqueues work for the Python worker.

## Running it

```bash
pnpm dev            # from the repository root, http://localhost:3000
```

It needs PostgreSQL and Redis reachable at the URLs in `.env`. See
[`infra/docker`](../../infra/docker/README.md) for the quickest way to get them.

## Routes

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/` | — | — | Demo page: enqueue a job, watch it run, see recent runs |
| `/api/health` | GET | — | Liveness probe; actually pings PostgreSQL and Redis |
| `/api/jobs/[name]/trigger` | POST | `Bearer $CRON_SECRET` | Enqueues a job — the entry point for external cron |
| `/api/jobs/status/[id]` | GET | — | Current state of one job |

```bash
curl -X POST http://localhost:3000/api/jobs/ingest-readings/trigger \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"device-001","from":"2026-08-19T00:00:00Z","to":"2026-08-20T00:00:00Z"}'
```

## Two doors to the same queue

The browser does **not** call the trigger route — that route is guarded by `CRON_SECRET`, which
must never reach the client. The demo page uses the Server Action in `app/actions.ts` instead.
Both paths call the same `enqueue()` from `@lasce/jobs`, so both are validated against the same
contract and land on the same queue.

## Structure

```
app/
├── page.tsx                          # demo page (server component, reads PostgreSQL)
├── actions.ts                        # Server Action that enqueues jobs
├── components/JobLauncher.tsx        # client component: enqueue + poll status
└── api/
    ├── health/route.ts
    └── jobs/
        ├── [name]/trigger/route.ts   # POST, secret-protected
        └── status/[id]/route.ts      # GET
```

Workspace packages are consumed as TypeScript source and compiled by Next through
`transpilePackages` in `next.config.ts`, so there is no build step to run before `pnpm dev`.
