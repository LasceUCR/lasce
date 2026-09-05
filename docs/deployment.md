# Deployment

How LASCE gets from a pull request to a running environment, and what to do when
something goes wrong.

Railway is the **initial** hosting target. Migrating to the UCR server is
deliberately deferred. See [Pending: UCR server migration](#pending-ucr-server-migration).

## 1. Pipeline overview

Two workflows, plus a scheduled one.

| Workflow                          | Trigger                                                        | What it does                                                  |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `.github/workflows/ci.yml`        | Pull requests into `development` / `main`, and `workflow_call` | Verification only. Never writes anything.                     |
| `.github/workflows/cd.yml`        | Push to `development` / `main`, or manual dispatch             | Calls `ci.yml`, publishes images to GHCR, deploys to Railway. |
| `.github/workflows/cron-jobs.yml` | 03:00 UTC daily, or manual dispatch                            | Enqueues recurring jobs.                                      |

`cd.yml` calls `ci.yml` as a reusable workflow rather than duplicating triggers,
so **a delivery is gated on exactly the same jobs that gate a pull request**,
and CI genuinely runs on pushes, not only on PRs.

### CI jobs

All eight run in parallel. The names are stable so a branch ruleset can require
them (LASCE-INF-001-016).

| Job               | Proves                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `lint`            | Prettier formatting is clean and ESLint passes on every Node workspace.                  |
| `typecheck`       | `tsc --noEmit` passes. Depends on `^build`, so the Prisma client is generated first.     |
| `test`            | `turbo run test` across every TypeScript workspace, with coverage floors enforced.       |
| `build`           | `turbo run build`: `prisma generate` then `next build`.                                  |
| `worker`          | ruff (lint + format check), mypy `--strict`, and pytest, on Python 3.13.                 |
| `e2e`             | Playwright/Chromium against `next dev`, with real Postgres and Redis service containers. |
| `docker (web)`    | `infra/docker/web.Dockerfile` builds. Not pushed.                                        |
| `docker (worker)` | `infra/docker/worker.Dockerfile` builds. Not pushed.                                     |

These are the display names GitHub reports on a pull request, and all eight are
required by the branch rulesets. The `docker` job pins `name:` to the matrix
name for that reason; left implicit, GitHub would append the Dockerfile path to
the check name. On a push, `cd.yml` calls this workflow as a reusable one, so
the same jobs report prefixed as `ci / lint` and so on. Those are a different set
of names and are not the ones required.

Shared setup lives in `.github/actions/setup`, which pins pnpm, Node (from
`.nvmrc`) and uv, restores the pnpm/uv/Turborepo caches, and bootstraps a CI
`.env` by copying `.env.example`. Every value in that file is a placeholder;
no secret is involved.

Adding a workspace does not require restructuring the workflow; the turbo
filters pick it up.

## 2. Branch → environment map

| Branch        | Railway environment | Approval                                                       |
| ------------- | ------------------- | -------------------------------------------------------------- |
| `development` | `staging`           | None, deploys automatically.                                   |
| `main`        | `production`        | **Required reviewers** on the `production` GitHub Environment. |

Manual runs: `gh workflow run cd.yml -f environment=staging`.

## 3. Image flow

Images are published to GHCR so the environment can move to the UCR server
without rewriting the pipeline.

```
ghcr.io/lasceucr/lasce-web:staging       ghcr.io/lasceucr/lasce-worker:staging
ghcr.io/lasceucr/lasce-web:staging-<sha> ghcr.io/lasceucr/lasce-worker:staging-<sha>
```

...and the same pair with `production`. The **mutable** tag is what each Railway
service points at; the **`-<sha>`** tag is immutable and is the rollback target.

Two consequences worth knowing:

- **The Railway CLI cannot change a service's image tag.** So `cd.yml` pushes
  over the mutable tag and then calls `railway redeploy`, which re-pulls it.
- **The web image cannot be promoted from staging to production.** `NEXT_PUBLIC_*`
  is inlined by the Next compiler, and `app/lib/site.ts` feeds `NEXT_PUBLIC_APP_URL`
  into `metadataBase`, `robots.ts` and `sitemap.ts`, all evaluated during
  `next build`. The URL is baked into the image, so `cd.yml` builds the web image
  per target with the right `--build-arg`. The worker image has no build-time
  configuration and is environment-agnostic.

Authentication uses the workflow's own `GITHUB_TOKEN` with `packages: write`.
No personal access token is stored in CI.

## 4. Database migrations

`prisma migrate deploy` runs as the web service's **Railway pre-deploy command**:

```
sh -c "cd /repo/migrator && node node_modules/prisma/build/index.js migrate deploy"
```

It runs inside the deployment, using the service's own `DATABASE_URL`, which is
a private `*.railway.internal` address and is unreachable from GitHub Actions,
which is why the migration cannot run from CI.

The web image carries a `migrator` stage for this: a flat, npm-installed Prisma
CLI plus a verbatim copy of `packages/db/prisma.config.ts` and the migrations
directory. `migrate deploy` does not need the generated client.

### Running migrations by hand

`.github/workflows/migrate.yml` is the manual counterpart, for applying a
migration without shipping code or recovering when a release stopped part way.
Run it from the Actions tab, choosing an environment and either `status` (report
what is pending) or `deploy` (apply it). Against `production` it waits for the
same reviewers as a deployment.

It needs **no connection string of its own**. It reaches the database through
the Railway CLI with the same `RAILWAY_TOKEN` the deploy job uses, so Railway
stays the only place the credentials live. `railway run --service postgres`
injects that service's variables into the command, and the workflow uses
`DATABASE_PUBLIC_URL` from them: a GitHub runner cannot reach
`*.railway.internal`, which is what the private `DATABASE_URL` points at.

That means the Postgres service **must have TCP Proxy enabled** (Settings →
Networking → TCP Proxy), which is what produces `DATABASE_PUBLIC_URL`. Without
it the workflow stops with `Postgres has no public proxy` rather than appearing
to succeed while migrating nothing.

**If the migration fails, the release aborts and the previous version stays
live.** That is the intended behaviour, and it is why this runs as a pre-deploy
step rather than as a separate CI step, which could not abort atomically.

Web is redeployed before worker so the schema is current before the worker
(which reads it through SQLAlchemy) restarts.

## 5. Secrets and variables

Nothing below is committed, and nothing is echoed in workflow logs.

### GitHub Environments

| Environment  | Branch policy      | Protection         | Secret          |
| ------------ | ------------------ | ------------------ | --------------- |
| `staging`    | `development` only | none               | `RAILWAY_TOKEN` |
| `production` | `main` only        | Required reviewers | `RAILWAY_TOKEN` |

A Railway **project token** is scoped to a single environment in a single
project, so these are two different tokens that share one secret name, and the
token alone decides which Railway environment is touched. Never create a
repo-level `RAILWAY_TOKEN`, and never use a Railway account/workspace token in
CI: it would grant write access to every project.

### Repository level

| Kind     | Name                                            | Used by                                                                           |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Variable | `APP_URL_STAGING`, `APP_URL_PRODUCTION`         | `cd.yml` (`context` job, which runs before the approval gate) and `cron-jobs.yml` |
| Secret   | `CRON_SECRET_STAGING`, `CRON_SECRET_PRODUCTION` | `cron-jobs.yml`                                                                   |

Domains are **not** declared in `.railway/railway.ts`. Railway rejects domain
registration from configuration, so generate or attach the domain in the
dashboard, then set these variables to whatever Railway actually assigned.

Both `APP_URL_*` values **must include the scheme**, for example
`https://lasce-staging.up.railway.app` and not `lasce-staging.up.railway.app`.
The value becomes `NEXT_PUBLIC_APP_URL`, which `app/lib/site.ts` passes to
`new URL()`; a bare hostname throws `TypeError: Invalid URL` and fails
`next build` while collecting `sitemap.xml`. The `context` job rejects a
schemeless value up front so the failure is immediate and explicit.

The `CRON_SECRET_*` values duplicate the `CRON_SECRET` set on each Railway web
service. **Rotating one without the other yields silent 401s.**

### Railway side (dashboard only)

- `CRON_SECRET` on each web service. Generate it with `openssl rand -hex 32`. It
  is `preserve()` in the IaC file precisely so it never enters git.
- **Registry credentials** on each service: Settings → Source → Registry
  Credentials → a GitHub PAT with `read:packages`. Railway supplies the GHCR
  username itself. This cannot be set through the CLI or IaC.

## 6. Infrastructure as code

Project topology lives in `.railway/railway.ts` and is applied **by a maintainer,
never from CI**:

```bash
railway link                                          # once, interactively
pnpm railway:plan  --environment staging
pnpm railway:apply --environment staging  --yes
pnpm railway:plan  --environment production
pnpm railway:apply --environment production --yes
```

`railway config apply` mutates services, plugins and volumes. Running it on every
push would let a routine code deploy destroy a volume, so code deploys use
`railway redeploy` only.

> `railway.json` / `railway.toml` (Config as Code) is deprecated and new services
> cannot opt into it. `.railway/railway.ts` is the replacement.

Do **not** connect a GitHub repo to either Railway service: a Railway deploy
trigger would race with GitHub Actions.

## 7. Rollback

1. Find the last good SHA tag: `ghcr.io/lasceucr/lasce-web:production-<sha>`.
2. In the Railway dashboard, either roll back through the service's deployment
   history (fastest), or repoint the service's image at that `-<sha>` tag and
   redeploy.
3. If the bad release included a migration, roll the schema forward with a new
   migration rather than reversing it, because `prisma migrate deploy` has no down step.

## 8. Operations

**Health.** Railway's private network is **IPv6 only**. Any client that resolves
IPv4 only cannot reach `*.railway.internal`, which surfaces as a healthcheck
that never passes rather than as an obvious error. `packages/jobs/src/connection.ts`
sets `family: 0` on the Redis connection for exactly this reason; ioredis
defaults to IPv4. Postgres is unaffected because `@prisma/adapter-pg` lets DNS
choose. `HOSTNAME=::` in the web image covers the inbound side.

`GET /api/health` returns `200` with
`{"status":"ok","checks":{"postgres":"ok","redis":"ok"}}` only when both
dependencies answer, and `503` with `"status":"degraded"` otherwise. It is the
service healthcheck and the smoke test at the end of every deploy. A Redis error
here usually means a private-networking or `HOSTNAME` bind problem.

**Triggering a job by hand.**

```bash
curl -X POST "$APP_URL/api/jobs/daily-rollup/trigger" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' -d '{}'
```

Valid job names are in `JOB_NAMES` (`packages/contracts/src/jobs.ts`):
`ingest-readings`, `process-file`, `daily-rollup`. Poll the returned id at
`GET /api/jobs/status/<id>`, or read the `job_runs` table.

Or through the pipeline: `gh workflow run cron-jobs.yml -f target=staging -f job=daily-rollup`.

**Logs.** `railway logs --service worker`. A healthy worker logs a `worker ready`
line with its queue name and concurrency on boot.

**Scheduling.** Recurring jobs are declared once in `packages/jobs/src/schedules.ts`
and fired by `cron-jobs.yml`, not by BullMQ's internal scheduler, so
`pnpm jobs:register` is **not** part of deployment. That script is a `tsx` file
with workspace-relative imports and is not present in the standalone runtime
image. Both mechanisms end at the same processors; see the docblock in
`schedules.ts`.

Two caveats: GitHub runs `schedule` triggers **only from the default branch**, so
`cron-jobs.yml` must be on `main` before it will ever fire; and scheduled
workflows are auto-disabled after 60 days of repository inactivity.

## 9. Pending: UCR server migration

The UCR server is not yet provisioned. Deferring it is deliberate, and the
pipeline is shaped so the move is a configuration change rather than a rewrite:

- Both images are already published to GHCR and are **not** Railway-specific.
- The worker image is fully environment-agnostic. The web image is agnostic apart
  from `NEXT_PUBLIC_APP_URL`, which is a build arg. Point it at the UCR hostname
  and rebuild.
- Configuration is entirely environment variables, listed in `.env.example`.
- The migration step is a plain `prisma migrate deploy`, runnable as a pre-start
  hook on any host using the `migrator` directory already inside the web image.

**What the migration actually requires:** pull the same GHCR tags on the UCR
host, supply the same environment variables, run `prisma migrate deploy` before
starting the web container, and repoint the `deploy` job in `cd.yml` from
`railway redeploy` to the new host's mechanism (SSH, Compose, systemd, …).

**No changes to `ci.yml`, and no changes to either Dockerfile.**

## 10. Known gaps

**InfluxDB 3 and MinIO are not provisioned.** Neither has a Railway plugin, and
both are deferred to a follow-up. Concretely, with the worker's defaults pointing
at `localhost`:

| Job               | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daily-rollup`    | **Works.** `processors/daily_rollup.py` returns early on an empty `Device` table, before touching InfluxDB. It will start failing once devices exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ingest-readings` | Fails on the InfluxDB write, is retried by BullMQ, ends `FAILED` in `job_runs`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `process-file`    | Fails on `ensure_bucket()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `apps/web`        | **Boots fine, but asset storage does not work.** `app/services/storage` (server-side upload/delete via the `assetStorage` instance in `app/services/container.ts`) is a service layer only — no route or UI calls it yet — and `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` are optional in `packages/config/src/env.ts` precisely so a missing MinIO does not stop the app from starting. The deployed public portal does not depend on it. Note the container instantiates the client **eagerly at module scope**, so the first import of `container.ts` is what surfaces a bad endpoint — see the caveat below. |

When this is picked up: MinIO maps onto Railway Buckets. Both MinIO SDKs are plain
S3 clients, so verify SigV4 region negotiation — neither side pins a region:
`apps/worker/app/clients/storage.py` builds `Minio(...)` with no `region=`, and
`apps/web/app/services/storage/implementations/MinioAsssetStorage.ts` likewise
passes none, and creates buckets with `makeBucket(bucket, '')`.

**The web client will not construct against the documented endpoint.** It passes
`MINIO_ENDPOINT` straight to MinIO's `endPoint`, which rejects a `host:port`
string with `InvalidEndpointError: Invalid endPoint : localhost:9000` — the value
`.env.example` ships and `packages/config` defaults to. Provisioning MinIO means
fixing that first; the port has to be split out, or the variable has to carry a
bare host. It also reads `MINIO_PORT` and `MINIO_DEFAULT_BUCKET`, neither of which
is in the `packages/config` schema. See
[manage-assets.md](manage-assets.md#known-gaps).

InfluxDB needs a container service from `influxdb:3-core` with a volume. Give it a
real admin token; do not carry over `INFLUXDB3_WITHOUT_AUTH`, which the Compose
file marks development-only.

**Branch rulesets are configured.** See
[`.github/rulesets/`](../.github/rulesets/) for the committed payloads and
[`git-guidelines.md`](git-guidelines.md) for what they enforce. The eight CI job
names above are the required status checks, so renaming a job means updating
those files in the same change.
