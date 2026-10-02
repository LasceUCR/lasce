import { z } from 'zod'

/**
 * Runtime environment shared by every Node process in the monorepo
 * (the Next.js server and the CLI scripts under `packages/jobs`).
 *
 * The Python worker validates the same variables independently in
 * `apps/worker/app/settings.py` — keep both in sync when adding one.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // PostgreSQL — owned by Prisma, read/written by the worker through SQLAlchemy.
  DATABASE_URL: z.url(),

  // Redis — transport for the BullMQ queue shared with the Python worker.
  REDIS_URL: z.url(),
  QUEUE_NAME: z.string().min(1).default('lasce'),

  // Protects POST /api/jobs/[name]/trigger so only your cron caller can enqueue.
  CRON_SECRET: z.string().min(8),

  // MinIO — S3-compatible object storage, shared with the Python worker, which
  // validates the same variables in apps/worker/app/settings.py.
  //
  // The two credentials are optional rather than required because MinIO is not
  // provisioned in every environment (docs/deployment.md, "Known gaps"). Making
  // them required here would stop the whole web app from booting over a feature
  // most requests never touch; instead MinioAssetStorage.fromEnv() throws,
  // naming the missing variable, the first time storage is actually used.
  MINIO_ENDPOINT: z.string().min(1).default('localhost:9000'),
  MINIO_ACCESS_KEY: z.string().min(1).optional(),
  MINIO_SECRET_KEY: z.string().min(1).optional(),
  MINIO_BUCKET: z.string().min(1).default('lasce-files'),
  MINIO_USE_SSL: z.stringbool().default(false),
  // Private bucket for the files /datos generates on request (chart images, data exports).
  // Never given a public policy: they are reachable only through 30-minute presigned links.
  MINIO_DOWNLOADS_BUCKET: z.string().min(1).default('lasce-downloads'),

  // InfluxDB 3 — written by the worker's `exis-pipeline`, read by the web for the
  // EXIS series on /datos. The token is optional for the same reason as the MinIO
  // credentials: a missing Influx must not stop the site from booting, only the
  // EXIS queries fail.
  INFLUXDB_HOST: z.url().default('http://localhost:8181'),
  INFLUXDB_TOKEN: z.string().min(1).optional(),
  INFLUXDB_DATABASE: z.string().min(1).default('lasce'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | undefined

/**
 * Parses and caches `process.env`. Throws a readable error listing every
 * missing or malformed variable instead of failing later at the call site.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached

  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment variables:\n${issues}\n\nCopy .env.example to .env and fill them in.`,
    )
  }

  cached = parsed.data
  return cached
}

/** Test helper: drops the memoized value so a new `process.env` is picked up. */
export function resetServerEnv(): void {
  cached = undefined
}
