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
