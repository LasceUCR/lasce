/**
 * Railway Infrastructure as Code for the LASCE project.
 *
 * Applied by a maintainer, never from CI:
 *
 *   railway link                                          # once, interactively
 *   pnpm railway:plan  --environment staging
 *   pnpm railway:apply --environment staging  --yes
 *   pnpm railway:plan  --environment production
 *   pnpm railway:apply --environment production --yes
 *
 * `railway config apply` mutates project topology (services, plugins, volumes),
 * so it must not run on every push: a routine code deploy has no business
 * being able to drop a volume. Code deploys go through .github/workflows/cd.yml,
 * which pushes an image to GHCR and calls `railway redeploy`.
 *
 * Note: railway.json / railway.toml (Config as Code) is deprecated and new
 * services cannot opt into it, which is why this file exists instead.
 */
import { defineRailway, image, postgres, preserve, project, redis, service } from 'railway/iac'

export default defineRailway((ctx) => {
  const staging = ctx.isEnvironment('staging')
  const tag = staging ? 'staging' : 'production'
  const appDomain = staging ? 'lasce-staging.up.railway.app' : 'lasce.up.railway.app'

  const db = postgres('postgres')
  const cache = redis('redis')

  // Mutable per-environment tags. The Railway CLI cannot change a service's
  // image tag, so cd.yml pushes over the tag and calls `railway redeploy`,
  // which re-pulls it. The immutable `:<tag>-<sha>` companion tag pushed
  // alongside it is the rollback target.
  const web = service('web', {
    source: image(`ghcr.io/lasceucr/lasce-web:${tag}`),
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      // Dual-stack bind, for Railway's private networking.
      HOSTNAME: '::',
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      // Must match the worker exactly, or producer and consumer silently use
      // different queues.
      QUEUE_NAME: 'lasce',
      // Set in the dashboard; preserve() keeps it out of git.
      CRON_SECRET: preserve(),
      // NEXT_PUBLIC_APP_URL is deliberately absent: Next inlines NEXT_PUBLIC_*
      // at compile time and app/lib/site.ts feeds it to robots.ts/sitemap.ts,
      // so it is passed as a Docker build arg in cd.yml instead.
    },
    // Runs inside the deployment, with the service's own DATABASE_URL. A failed
    // migration aborts the release and leaves the previous version live.
    preDeploy:
      'sh -c "cd /repo/migrator && node node_modules/prisma/build/index.js migrate deploy"',
    // 200 only when both Postgres and Redis answer.
    healthcheck: '/api/health',
    healthcheckTimeout: 300,
    domains: [{ domain: appDomain, port: 3000 }],
    replicas: 1,
  })

  const worker = service('worker', {
    source: image(`ghcr.io/lasceucr/lasce-worker:${tag}`),
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      QUEUE_NAME: 'lasce',
      WORKER_CONCURRENCY: staging ? '2' : '4',
      LOG_LEVEL: staging ? 'debug' : 'info',
      // INFLUXDB_* / MINIO_* are intentionally unset: neither has a Railway
      // plugin and both are deferred. `daily-rollup` still succeeds while the
      // Device table is empty; `ingest-readings` and `process-file` will fail
      // until these are provisioned. See docs/deployment.md.
    },
    // No HTTP listener, so no healthcheck and no domain.
    replicas: 1,
  })

  return project('lasce', { resources: [db, cache, web, worker] })
})
