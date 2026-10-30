import { prisma, Prisma } from '@lasce/db'

/**
 * Two small primitives for CMS writes. They only run a transaction and classify how it ended; the
 * queries, relations, business rules and the optimistic-concurrency update stay in each entity's
 * service, next to the model they touch. Server-only: it imports the Prisma client.
 */

/** An expected failure of a write: `reason` says which, extra fields explain it. */
export type WriteFailure = { ok: false; reason: string }

/**
 * Thrown inside a transaction to roll it back and report `failure` to the caller. Throwing (rather
 * than returning early) is what makes Prisma roll back everything the transaction already wrote.
 */
export class WriteAbort<F extends WriteFailure> extends Error {
  constructor(readonly failure: F) {
    super(failure.reason)
  }
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value

  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

function asStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

/**
 * The columns (or fields) a unique-constraint violation (`P2002`) names, or `null` for any other
 * error. With the driver adapter the project uses, Prisma reports them under
 * `meta.driverAdapterError.cause.constraint.fields` as column names; without one, under
 * `meta.target`. Both are read, so a caller can match either spelling.
 */
export function uniqueViolationColumns(error: unknown): string[] | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null
  }

  return [
    ...asStrings(readPath(error.meta, ['target'])),
    ...asStrings(readPath(error.meta, ['driverAdapterError', 'cause', 'constraint', 'fields'])),
  ]
}

/**
 * Runs `write` in an interactive transaction and turns its expected failures into results:
 *
 * - a `WriteAbort` thrown inside it becomes its `failure`;
 * - a unique violation becomes whatever `onUniqueViolation` makes of its columns, when it
 *   recognizes them.
 *
 * Both happen after the transaction has rolled back. Catching a database error inside an
 * interactive transaction would leave PostgreSQL's transaction aborted, so failures are only ever
 * classified here, outside it. Anything else is rethrown for the route to log as an internal error.
 */
export async function runWrite<T, F extends WriteFailure>(
  write: (tx: Prisma.TransactionClient) => Promise<T>,
  onUniqueViolation?: (columns: readonly string[]) => F | null,
): Promise<{ ok: true; value: T } | F> {
  try {
    return { ok: true, value: await prisma.$transaction(write) }
  } catch (error) {
    if (error instanceof WriteAbort) return error.failure as F

    const columns = uniqueViolationColumns(error)
    const failure = columns && onUniqueViolation ? onUniqueViolation(columns) : null
    if (failure) return failure

    throw error
  }
}

/**
 * Deletes a record and reports it in one transaction: `find` reads what the audit event needs to
 * name (it must still read after the record is gone), `remove` deletes it in one statement that
 * counts the rows it removed, and `audit` records the event. Resolves `false`, writing nothing,
 * when the record is already gone, so a concurrent delete answers "not found".
 */
export async function runAuditedDelete<T>(
  find: (tx: Prisma.TransactionClient) => Promise<T | null>,
  remove: (tx: Prisma.TransactionClient, found: T) => Promise<{ count: number }>,
  audit: (tx: Prisma.TransactionClient, found: T) => Promise<void>,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const found = await find(tx)
    if (!found) return false

    const { count } = await remove(tx, found)
    if (count === 0) return false

    await audit(tx, found)
    return true
  })
}
