import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  /** Stands in for Prisma's error class, which the module checks with `instanceof`. */
  class PrismaClientKnownRequestError extends Error {
    readonly code: string
    readonly meta: unknown

    constructor(message: string, { code, meta }: { code: string; meta?: unknown }) {
      super(message)
      this.code = code
      this.meta = meta
    }
  }

  const tx = { writes: [] as string[] }
  const prisma = { $transaction: vi.fn() }

  return { tx, prisma, PrismaClientKnownRequestError }
})

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const { runWrite, uniqueViolationColumns, WriteAbort } = await import('./transaction')

type Failure = { ok: false; reason: 'missing' } | { ok: false; reason: 'taken'; field: string }

function uniqueViolation(meta: unknown) {
  return new mocks.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    meta,
  })
}

/** Runs the callback like Prisma does: whatever it throws rejects the transaction (a rollback). */
beforeEach(() => {
  mocks.tx.writes = []
  mocks.prisma.$transaction.mockReset()
  mocks.prisma.$transaction.mockImplementation(async (write: (tx: unknown) => unknown) =>
    write(mocks.tx),
  )
})

function onUnique(columns: readonly string[]): Failure | null {
  return columns.includes('slug') ? { ok: false, reason: 'taken', field: 'slug' } : null
}

describe('runWrite', () => {
  test('returns what the transaction returns', async () => {
    const result = await runWrite<number, Failure>(async (tx) => {
      ;(tx as unknown as typeof mocks.tx).writes.push('row')
      return 42
    })

    expect(result).toEqual({ ok: true, value: 42 })
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  test('turns a WriteAbort into its failure, after the transaction rejected', async () => {
    const result = await runWrite<number, Failure>(async () => {
      throw new WriteAbort<Failure>({ ok: false, reason: 'missing' })
    })

    expect(result).toEqual({ ok: false, reason: 'missing' })
    await expect(mocks.prisma.$transaction.mock.results[0]?.value).rejects.toBeInstanceOf(
      WriteAbort,
    )
  })

  test('maps a recognized unique violation, reported under meta.target', async () => {
    mocks.prisma.$transaction.mockRejectedValue(uniqueViolation({ target: ['slug'] }))

    expect(await runWrite(async () => 1, onUnique)).toEqual({
      ok: false,
      reason: 'taken',
      field: 'slug',
    })
  })

  test('maps a unique violation reported by the driver adapter', async () => {
    mocks.prisma.$transaction.mockRejectedValue(
      uniqueViolation({ driverAdapterError: { cause: { constraint: { fields: ['slug'] } } } }),
    )

    expect(await runWrite(async () => 1, onUnique)).toEqual({
      ok: false,
      reason: 'taken',
      field: 'slug',
    })
  })

  test('rethrows a unique violation it does not recognize, or with no mapping given', async () => {
    const other = uniqueViolation({ target: ['email'] })
    mocks.prisma.$transaction.mockRejectedValue(other)
    await expect(runWrite(async () => 1, onUnique)).rejects.toBe(other)

    const known = uniqueViolation({ target: ['slug'] })
    mocks.prisma.$transaction.mockRejectedValue(known)
    await expect(runWrite<number, Failure>(async () => 1)).rejects.toBe(known)
  })

  test('rethrows any other error unchanged', async () => {
    const foreignKey = new mocks.PrismaClientKnownRequestError('FK', { code: 'P2003' })
    mocks.prisma.$transaction.mockRejectedValue(foreignKey)
    await expect(runWrite(async () => 1, onUnique)).rejects.toBe(foreignKey)

    const crash = new Error('connection lost')
    mocks.prisma.$transaction.mockRejectedValue(crash)
    await expect(runWrite(async () => 1, onUnique)).rejects.toBe(crash)
  })
})

describe('uniqueViolationColumns', () => {
  test('reads both spellings and keeps every column', () => {
    expect(
      uniqueViolationColumns(
        uniqueViolation({
          target: 'doi',
          driverAdapterError: { cause: { constraint: { fields: ['external_url', 7] } } },
        }),
      ),
    ).toEqual(['doi', 'external_url'])
  })

  test('is empty for a unique violation without details', () => {
    expect(uniqueViolationColumns(uniqueViolation(undefined))).toEqual([])
    expect(uniqueViolationColumns(uniqueViolation({ target: { weird: true } }))).toEqual([])
  })

  test('is null for anything that is not a unique violation', () => {
    expect(
      uniqueViolationColumns(new mocks.PrismaClientKnownRequestError('x', { code: 'P2025' })),
    ).toBeNull()
    expect(uniqueViolationColumns(new Error('P2002'))).toBeNull()
    expect(uniqueViolationColumns({ code: 'P2002', meta: { target: ['slug'] } })).toBeNull()
    expect(uniqueViolationColumns(null)).toBeNull()
  })
})
