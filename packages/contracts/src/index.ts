/**
 * Runtime contracts shared between the Next.js app and the Python worker.
 *
 * Every schema here is exported to JSON Schema by `pnpm contracts:export`
 * so the worker can verify its own models against it.
 */

export * from './jobs'
