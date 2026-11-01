# Deployment

How LASCE gets from a pull request to a running environment, and what to do when
something goes wrong.

Both environments run on the Universidad de Costa Rica's campus servers, managed
by a self-hosted [Coolify](https://coolify.io). The first-time setup of a server,
of Coolify and of the self-hosted runner is in
[`infra/coolify/README.md`](../infra/coolify/README.md).

## 1. Pipeline overview

| Workflow                          | Trigger                                                        | What it does                                                                  |
| --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`        | Pull requests into `development` / `main`, and `workflow_call` | Verification only. Never writes anything.                                     |
| `.github/workflows/cd.yml`        | Push to `development` / `main`, or manual dispatch             | Calls `ci.yml`, publishes images to GHCR, deploys through Coolify.            |
| `.github/workflows/cron-jobs.yml` | Manual dispatch only                                           | Enqueues one job, once.                                                       |
| `.github/workflows/ops.yml`       | Manual dispatch only                                           | Syncs the declared job schedules into one environment, without shipping code. |
| `.github/workflows/rulesets.yml`  | Pull requests into `main`, ruleset changes, 12:00 UTC daily    | Fails if the live branch rulesets differ from the JSON files.                 |

`cd.yml` calls `ci.yml` as a reusable workflow rather than duplicating triggers,
so **a delivery is gated on exactly the same jobs that gate a pull request**,
and CI genuinely runs on pushes, not only on PRs.

### CI jobs

All eight run in parallel. The names are stable so a branch ruleset can require
them (LASCE-INF-001-016).

| Job               | Proves                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `lint`            | Prettier formatting is clean and ESLint passes on every Node workspace.                     |
| `typecheck`       | `tsc --noEmit` passes. Depends on `^build`, so the Prisma client is generated first.        |
| `test`            | `turbo run test` across every TypeScript workspace, with coverage floors enforced.          |
| `build`           | `turbo run build`: `prisma generate` then `next build`.                                     |
| `worker`          | ruff (lint + format check), mypy `--strict`, and pytest, on Python 3.13.                    |
| `e2e`             | Playwright against the production build, in four shards, each with real Postgres and Redis. |
| `docker (web)`    | `infra/docker/web.Dockerfile` builds. Not pushed.                                           |
| `docker (worker)` | `infra/docker/worker.Dockerfile` builds. Not pushed.                                        |

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

## 2. Hosts and environments

| Branch        | Environment  | URL                       | Approval                                                       |
| ------------- | ------------ | ------------------------- | -------------------------------------------------------------- |
| `development` | `staging`    | `APP_URL_STAGING`         | None, deploys automatically.                                   |
| `main`        | `production` | `https://lasce.ucr.ac.cr` | **Required reviewers** on the `production` GitHub Environment. |

Manual runs: `gh workflow run cd.yml -f environment=staging`.

| Host             | Role                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `172.16.49.26`   | Coolify (`:8000`) and **both** environments. Public as `163.178.171.26`, ports 80/443. |
| `172.16.202.224` | Jump host and the self-hosted GitHub Actions runner. Carries no application.           |

Every machine is on the UCR private network, behind the VPN. From outside it,
only ports 80 and 443 of `172.16.49.26` are reachable, and every public name
(`lasce.ucr.ac.cr`, the staging name, both storage names) points at that one
address; Coolify's proxy routes by hostname. Coolify itself is reachable from
the campus network only.

Until UCR IT creates a `*.lasce.ucr.ac.cr` record, use an [sslip.io](https://sslip.io) name
instead: any `<label>.163.178.171.26.sslip.io` resolves to the public address, and Let's
Encrypt issues certificates for it, so the `Secure` cookie and the `next/image` public-host
rules are both satisfied. Staging uses `staging.163.178.171.26.sslip.io` and
`archivos-staging.163.178.171.26.sslip.io`. Switching to the real name later means changing the
domain in Coolify, `APP_URL_*`, `MINIO_PUBLIC_URL` and `MINIO_ENDPOINT_*`, then redeploying so
the image is rebuilt.

The campus network lets `172.16.202.x` open connections to `172.16.49.26` but
not the reverse, so Coolify cannot manage a second server on that subnet. That
is why staging shares the production machine instead of running on its own.
Give each resource memory limits in Coolify so a runaway staging stack cannot
starve production.

Each environment is one Coolify **Docker Compose resource** in the `lasce`
project, built from [`infra/coolify/compose.yml`](../infra/coolify/compose.yml):
Postgres, Redis, InfluxDB 3, MinIO, a one-shot `migrate` service, `web` and
`worker`. Staging's resource tracks `development` and production's tracks
`main`, so each reads the compose file from the branch it deploys. Coolify's
Traefik proxy terminates TLS with Let's Encrypt certificates for the domains
assigned to `web` and `minio` in its UI.

## 3. Image flow

Images are built on GitHub-hosted runners and published to GHCR:

```
ghcr.io/lasceucr/lasce-web:staging       ghcr.io/lasceucr/lasce-worker:staging
ghcr.io/lasceucr/lasce-web:staging-<sha> ghcr.io/lasceucr/lasce-worker:staging-<sha>
```

...and the same pair with `production`. The **mutable** tag is what the Coolify
resource's `LASCE_TAG` points at; the **`-<sha>`** tag is immutable and is the
rollback target.

**The web image cannot be promoted from staging to production.** `NEXT_PUBLIC_*`
is inlined by the Next compiler, and `app/lib/site.ts` feeds `NEXT_PUBLIC_APP_URL`
into `metadataBase`, `robots.ts` and `sitemap.ts`, all evaluated during
`next build`. The URL is baked into the image, so `cd.yml` builds the web image
per target with the right `--build-arg`. The same goes for the storage host that
`next/image` is allowed to load from (see [Uploaded images](#uploaded-images)).
The worker image has no build-time configuration and is environment-agnostic.

Authentication uses the workflow's own `GITHUB_TOKEN` with `packages: write`.
No personal access token is stored in CI.

## 4. The deploy job

Coolify and the servers are unreachable from GitHub's runners, so the `deploy`
job runs on a **self-hosted runner** on the jump host `172.16.202.224`, labelled
`lasce-coolify`. It needs only `curl` and `jq`:

1. `POST $COOLIFY_URL/api/v1/deploy?uuid=$COOLIFY_RESOURCE_UUID` asks Coolify to
   redeploy the environment's resource, which pulls the tag the `images` job just
   pushed. The job then polls `/api/v1/deployments/<uuid>` until Coolify reports
   `finished`, and fails on `failed` or `cancelled`.
2. A smoke test polls `$APP_URL/api/health` until it answers 200.
3. `POST $APP_URL/api/jobs/schedules` syncs the job schedules (see
   [Scheduling](#scheduling)).

### Runner security

This repository is public, and a self-hosted runner executes whatever a workflow
sends it. The design keeps that safe:

- Only `cd.yml`'s `deploy` job and `ops.yml` target the `lasce-coolify` label.
  `ci.yml`, which runs pull requests, never does.
- The runner runs as an unprivileged user that is **not** in the `docker` group
  and has no credentials on disk. It cannot touch a container itself, only call
  Coolify with the token the job hands it.
- `COOLIFY_TOKEN` is a GitHub **Environment** secret. The environments' branch
  policies (`staging` ← `development`, `production` ← `main`) mean a workflow
  from any other branch never receives it.
- Workflows from forks require approval for every external contributor
  (Settings → Actions → General).

Anyone with write access can still point a workflow on their own branch at the
runner. That is the same trust that write access already implies, and it yields
no deploy token.

## 5. Database migrations

`prisma migrate deploy` runs on every deploy as the **`migrate` service** of the
compose file: a one-shot container from the web image that runs

```
sh -c "cd /repo/migrator && node node_modules/prisma/build/index.js migrate deploy"
```

against the environment's own Postgres. `web` and `worker` depend on it with
`condition: service_completed_successfully`, so **if the migration fails, the
release stops before the running containers are replaced** and the Coolify
deployment, and with it the `deploy` job, fails. The web image carries the
`migrator` directory for this: a flat, npm-installed Prisma CLI plus a verbatim
copy of `packages/db/prisma.config.ts` and the migrations directory.
`migrate deploy` does not need the generated client.

To see what is pending without deploying, open the `web` container's terminal in
Coolify and run the same command with `migrate status`. To apply migrations
without shipping code, redeploy the resource from Coolify.

### Seeding and the first administrator

A new environment starts empty. Seed it once, from a machine on the VPN,
through an SSH tunnel to the loopback-only Postgres port: `15432` for
production and `15433` for staging, set by `POSTGRES_LOOPBACK_PORT` because both
share one host.

```bash
ssh -N -L 15433:127.0.0.1:15433 lasce-coolify &      # 15432 for production
DATABASE_URL='postgresql://lasce:<POSTGRES_PASSWORD>@127.0.0.1:15433/lasce' pnpm db:seed
```

The seed checks each table before inserting, so running it again is safe. It
creates no account you can sign in with. Register the first administrator at
`/registro`, then grant the role through the same tunnel with `psql`.
`pnpm accounts:create` makes throwaway QA accounts only.

## 6. Secrets and variables

Nothing below is committed, and nothing is echoed in workflow logs.

### Coolify (per resource)

Set in the resource's environment variables. The compose file fails the deploy
when one is missing.

| Variable                 | Value                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `LASCE_TAG`              | `staging` or `production`, or `<env>-<sha>` to roll back.                                                 |
| `POSTGRES_PASSWORD`      | Random, `openssl rand -hex 24`.                                                                           |
| `CRON_SECRET`            | Random, `openssl rand -hex 32`. Must equal `CRON_SECRET_STAGING` / `CRON_SECRET_PRODUCTION` in GitHub.    |
| `MINIO_ACCESS_KEY`       | MinIO root user.                                                                                          |
| `MINIO_SECRET_KEY`       | MinIO root password, random.                                                                              |
| `MINIO_PUBLIC_URL`       | The `minio` service's public URL, scheme included. Must equal `MINIO_ENDPOINT_STAGING` / `_PRODUCTION`.   |
| `INFLUXDB_TOKEN`         | `pending` on the first deploy, then the admin token minted in the `influxdb` container (see the runbook). |
| `WORKER_CONCURRENCY`     | Optional, default `4`. `2` on staging.                                                                    |
| `LOG_LEVEL`              | Optional, default `info`. `debug` on staging.                                                             |
| `POSTGRES_LOOPBACK_PORT` | Optional, default `15432`. **`15433` on staging**, which shares the host with production.                 |

### GitHub Environments

| Environment  | Branch policy      | Protection         | Secret          | Variables                              |
| ------------ | ------------------ | ------------------ | --------------- | -------------------------------------- |
| `staging`    | `development` only | none               | `COOLIFY_TOKEN` | `COOLIFY_URL`, `COOLIFY_RESOURCE_UUID` |
| `production` | `main` only        | Required reviewers | `COOLIFY_TOKEN` | `COOLIFY_URL`, `COOLIFY_RESOURCE_UUID` |

`COOLIFY_URL` is `http://172.16.49.26:8000`. Create the token in Coolify (Keys &
Tokens → API tokens) with only the **read** and **deploy** permissions; read is
what lets the job poll the deployment. A Coolify token is scoped to a team, not
to one environment, so the resource UUID is what picks the environment. Never give CI a token with write or root permissions.

### Repository level

| Kind     | Name                                                  | Used by                                                                        |
| -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Variable | `APP_URL_STAGING`, `APP_URL_PRODUCTION`               | `cd.yml` (`context` job, which runs before the approval gate), `cron-jobs.yml` |
| Variable | `MINIO_ENDPOINT_STAGING`, `MINIO_ENDPOINT_PRODUCTION` | `cd.yml` (`images` job). Build args that feed the `next/image` allowlist.      |
| Variable | `MINIO_USE_SSL_STAGING`, `MINIO_USE_SSL_PRODUCTION`   | Same. Ignored when the endpoint is a URL, whose scheme decides.                |
| Variable | `WEBDOTS_API_URL`                                     | `cd.yml` (`images` job). Unset means the annotation widget is off everywhere.  |
| Secret   | `CRON_SECRET_STAGING`, `CRON_SECRET_PRODUCTION`       | `cd.yml` (`deploy` job), `ops.yml`, `cron-jobs.yml`                            |
| Secret   | `WEBDOTS_API_KEY`                                     | `cd.yml` (`images` job). Public in the client bundle once set.                 |

Both `APP_URL_*` values **must include the scheme**, for example
`https://lasce.ucr.ac.cr` and not `lasce.ucr.ac.cr`. The value becomes
`NEXT_PUBLIC_APP_URL`, which `app/lib/site.ts` passes to `new URL()`; a bare
hostname throws `TypeError: Invalid URL` and fails `next build` while collecting
`sitemap.xml`. The `context` job rejects a schemeless value up front so the
failure is immediate and explicit.

The `CRON_SECRET_*` values duplicate the `CRON_SECRET` set on each Coolify
resource. **Rotating one without the other yields silent 401s**, and the
schedule sync at the end of a deploy is where that shows first.

## 7. Build-time configuration

### Uploaded images

Uploading an image and displaying it use two different configurations, which is why one can
work while the other fails:

- **Upload** is a Server Action calling the storage service. It reads `MINIO_ENDPOINT`,
  `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` and the bucket names from the **runtime**
  environment, so the variables set on the web service are enough.
- **Display** goes through `next/image`, which only fetches hosts listed in
  `images.remotePatterns`. `next.config.ts` builds that list from `MINIO_ENDPOINT` and
  `MINIO_USE_SSL` while `next build` runs, and the result is baked into the image. Setting
  them on the running service does nothing.

The CI build has no `.env` (it is gitignored and in `.dockerignore`), so unless the values
arrive as build args the allowlist is empty and every uploaded photo fails with
`url parameter is not allowed` (`/_next/image` answers 400) even though the upload
succeeded. `cd.yml` passes both from repository variables, and `web.Dockerfile` exposes them
as `ARG`/`ENV` in the builder stage.

Set the repository variables `MINIO_ENDPOINT_STAGING` / `MINIO_ENDPOINT_PRODUCTION` to **the same
value as the resource's `MINIO_PUBLIC_URL`**, then redeploy so a new image is built. They hold only the host and
a flag, never credentials: do not pass `MINIO_ACCESS_KEY` or `MINIO_SECRET_KEY` as build args,
because build args can be read from the image metadata and build logs.

The image optimizer also refuses a storage host that resolves to a private or loopback address
in a production build (`dangerouslyAllowLocalIP` in `next.config.ts`), so the MinIO domain has to
resolve to a public address, even for staging.

If images still fail after the rebuild, open the raw image URL. A `403` means the bucket does
not allow anonymous reads; the upload path sets a public-read policy on every upload, but a
hosted bucket may refuse it.

### The annotation widget

`AnnotateWidget` mounts the WebDots QA overlay. It is a client component, so the
package and its configuration are compiled into the browser bundle. **Setting
`NEXT_PUBLIC_WEBDOTS_*` on the running service does nothing**, in either
direction: it cannot switch the widget on, and it cannot switch it off once an
image was built with it. The values have to reach `next build` as build args, so
`web.Dockerfile` declares one `ARG` per variable, all defaulting to empty.

**The widget is enabled by configuration alone, in every environment including
production.** `cd.yml` passes the values unconditionally, and there is exactly
one way to switch the widget off: leave `WEBDOTS_API_URL` unset, which is the
default and does not fail the build.

The app also honours `NEXT_PUBLIC_WEBDOTS_DISABLED`, but the pipeline does not
set it. It exists for builds you run yourself and for the Playwright suite,
which sets it on the dev server in `playwright.config.ts` so the widget does not
inject a third-party overlay into pages the axe sweep is about to scan. It is
deliberately not wired to a repository variable: that would be a second way to
express what an unset `WEBDOTS_API_URL` already says.

Because the values are inlined rather than read at runtime, turning the widget
off does not merely hide it. The guard folds to a constant, `init()` becomes
unreachable and the library is tree-shaken out, so the image ships neither the
configuration nor the package. Verified for both off states: an unconfigured
build, and a build with `NEXT_PUBLIC_WEBDOTS_DISABLED=true`. In the second case
the API key is dropped from the bundle as well, so disabling the widget by hand
also removes the public exposure described below rather than leaving a dormant
key in place.

`WEBDOTS_API_KEY` is inlined into the client bundle and is therefore **readable
by anyone who opens the site, production included**. That is inherent to the
`NEXT_PUBLIC_` prefix, not something the pipeline can prevent. One key covers
both environments, so rotating it affects both. Keep it scoped to annotation
submission.

## 8. Rollback

1. Find the last good SHA tag: `ghcr.io/lasceucr/lasce-web:production-<sha>`.
2. In Coolify, set the resource's `LASCE_TAG` to `production-<sha>` and redeploy.
   Both images carry the same tag, so web and worker roll back together.
3. Set `LASCE_TAG` back to `production` once the fix is merged, or the next
   deploy will keep running the old version.
4. If the bad release included a migration, roll the schema forward with a new
   migration rather than reversing it, because `prisma migrate deploy` has no down step.

## 9. Operations

**Health.** `GET /api/health` returns `200` with
`{"status":"ok","checks":{"postgres":"ok","redis":"ok"}}` only when both
dependencies answer, and `503` with `"status":"degraded"` otherwise. It is the
`web` container's healthcheck and the smoke test at the end of every deploy.
Coolify's proxy stops routing to a container that is not healthy, so a degraded
health check takes the site offline rather than serving half of it.

`GET /api/health/services` is **not** a healthcheck: it reports the services a deploy should not
wait on, for the Servicios panel of `/administracion`. It answers only to accounts that may open
the administration panel (`401`/`403` otherwise), with
`{"status":"ok","checks":{"api":"ok","workers":"ok","minio":"ok","influxdb":"ok"}}`, or `503`,
`"degraded"` and `"down"` for each failing service. `workers` is `down` when no BullMQ worker holds
a connection to the queue; MinIO is probed with `bucketExists(MINIO_BUCKET)` and InfluxDB with its
`/health` endpoint. The failure reasons go to the log (`services health check degraded:`), never
to the browser. Probes live in `apps/web/app/lib/service-health.ts`.

**Triggering a job by hand.**

```bash
curl -X POST "$APP_URL/api/jobs/ingest-readings/trigger" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' -d '{}'
```

Valid job names are in `JOB_NAMES` (`packages/contracts/src/jobs.ts`). The body must satisfy
that job's payload contract, or the route answers `422`.
Poll the returned id at `GET /api/jobs/status/<id>`.

Or through the pipeline: `gh workflow run cron-jobs.yml -f target=staging -f job=ingest-readings`.

**Logs.** In Coolify, open the resource and pick the container. A healthy worker
logs a `worker ready` line with its queue name and concurrency on boot.

### Scheduling

Recurring jobs are declared once in `packages/jobs/src/schedules.ts` and fired
by BullMQ's scheduler, which lives in Redis. The deployed Redis is reachable only
inside its compose network, so the deploy cannot run `pnpm jobs:register`
against it. Instead the last step of the `deploy` job calls
`POST /api/jobs/schedules` with the environment's `CRON_SECRET`, and the web app
runs `syncSchedules()` (`packages/jobs/src/sync-schedules.ts`), the same code
the script uses. It is idempotent: it upserts every declared entry and removes
any scheduler that is no longer declared, so editing `schedules.ts` and merging
is all it takes to change what fires.

To sync without a deploy: `gh workflow run ops.yml -f target=production`.

`cron-jobs.yml` schedules nothing. It is a manual trigger that enqueues one job
per run.

## 10. Known gaps

**No automated backups yet.** Postgres, InfluxDB and MinIO live in Docker
volumes on `172.16.49.26`. Until a scheduled `pg_dump` (and a MinIO mirror) to
another host exists, a lost disk loses the environment's data.

**`/api/health` shows configuration errors to anyone.** When `serverEnv()`
rejects the environment, the check's message, which names the invalid variable,
is returned in the response body. It contains no values, but it should be
logged and replaced by a generic reason.

**Branch rulesets are configured.** See
[`.github/rulesets/`](../.github/rulesets/) for the committed payloads and
[`git-guidelines.md`](git-guidelines.md) for what they enforce. The eight CI job
names above are the required status checks, so renaming a job means updating
those files in the same change.
