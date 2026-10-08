import { z } from 'zod'

/**
 * Optimistic concurrency for CMS records, using the row's own `updated_at` (`timestamptz(3)`) as
 * the version: no extra column. The token is opaque to clients; they send back what they loaded.
 *
 * How a service uses it, all inside one transaction:
 *
 * 1. Read the row; if `!isCurrentVersion(row.updatedAt, expected)`, it is a conflict.
 * 2. Update with a condition on the version (`updateMany({ where: { id, updatedAt: expected } })`)
 *    and `updatedAt: nextUpdatedAt(expected)`; `count === 0` is a conflict too. The conditional
 *    update also locks the row until commit.
 *
 * The conditional update itself stays in each service, next to the model it writes. Client-safe:
 * the editor's request schemas use `versionSchema`.
 */

/** The token for a record: its `updated_at` as ISO 8601 in UTC with milliseconds. */
export function toVersion(updatedAt: Date): string {
  return updatedAt.toISOString()
}

/** A request's `version`: an ISO 8601 date-time with an offset, as `toVersion` writes it. */
export function versionSchema(message: string) {
  return z.iso.datetime({ offset: true, error: message })
}

/** The `updated_at` a validated `version` stands for. */
export function parseVersion(version: string): Date {
  return new Date(version)
}

/** True while the stored `updated_at` is still the one the editor loaded. */
export function isCurrentVersion(updatedAt: Date, expected: Date): boolean {
  return updatedAt.getTime() === expected.getTime()
}

/**
 * The `updated_at` a save writes: now, but always strictly later than the version it replaces,
 * so two saves within the same millisecond, or a clock that moved backwards, still produce a new
 * version and the next stale save is caught.
 */
export function nextUpdatedAt(expected: Date, now: number = Date.now()): Date {
  return new Date(Math.max(now, expected.getTime() + 1))
}
