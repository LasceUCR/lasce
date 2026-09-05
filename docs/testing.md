# Testing

The project runs three separate suites, and each one is a required status check
on every Pull Request:

| Suite           | CI job   | Runner                                     |
| --------------- | -------- | ------------------------------------------ |
| TypeScript unit | `test`   | Vitest                                     |
| End-to-end      | `e2e`    | Playwright, Chromium                       |
| Python worker   | `worker` | pytest, plus ruff and mypy in the same job |

For how to write a UI component test specifically, see
[`tests/component_testing.md`](tests/component_testing.md). This page covers
where a test file belongs and what gates it.

## Where tests go

| Kind                    | Location                          | Collected by                                                   |
| ----------------------- | --------------------------------- | -------------------------------------------------------------- |
| Web component or helper | `apps/web/app/**/*.test.tsx`      | `apps/web/vitest.config.ts`, `include: app/**/*.test.{ts,tsx}` |
| Shared package          | `packages/<pkg>/src/**/*.test.ts` | that package's `vitest.config.ts`, `include: src/**/*.test.ts` |
| End-to-end              | `apps/web/tests/e2e/*.spec.ts`    | `apps/web/playwright.config.ts`, `testDir: ./tests/e2e`        |
| Python worker           | `apps/worker/tests/test_*.py`     | `apps/worker/pyproject.toml`, `testpaths = ["tests"]`          |

The rule in one line: **TypeScript tests sit next to the code they test;
Playwright and pytest live in their own `tests/` directory.**

Existing files to copy the shape from:

```
apps/web/app/components/public/WorkAreaCard.test.tsx   next to WorkAreaCard.tsx
packages/jobs/src/enqueue.test.ts                      next to enqueue.ts
apps/web/tests/e2e/public-portal.spec.ts               Playwright
apps/worker/tests/test_settings.py                     pytest
```

Colocation is deliberate for the TypeScript suites: touching a module and
forgetting its test should be one `git status` glance apart. There is no
`__tests__` folder anywhere.

## The split is enforced by config, and failure is silent

`.test.ts`/`.test.tsx` and `.spec.ts` are not interchangeable. Vitest is
confined to `app/` and `src/`, Playwright owns `tests/e2e`, and that is what
keeps `turbo run test` from starting a browser or a dev server.

Two things follow, and neither announces itself:

- A test file placed **outside** the `include` glob is never collected. It does
  not error. It simply never runs, and never gates anything.
- A Playwright spec dropped into `app/` would be picked up by Vitest and launch
  a browser inside the unit suite.

If a new test appears to pass instantly, check that it ran at all.

## Python worker specifics

pytest is configured in `apps/worker/pyproject.toml`:

- `testpaths = ["tests"]`, so only `apps/worker/tests/` is scanned.
- `asyncio_mode = "auto"`, so an `async def test_*` needs no decorator.
- Shared fixtures belong in `apps/worker/tests/conftest.py`.
- Coverage runs by default through `addopts`, so `uv run pytest` locally reports
  the same number the pipeline gates on.

The `worker` job also runs `ruff check`, `ruff format --check` and `mypy app`.
mypy is `strict = true`, with `untyped_calls_exclude` for the InfluxDB, MinIO
and BullMQ clients, which ship no type information.

## Running

```bash
pnpm turbo run test                  # every TypeScript workspace, with coverage
pnpm --filter @lasce/web test:unit   # fast loop, no coverage
pnpm --filter @lasce/web test:e2e    # Playwright, needs Postgres and Redis
cd apps/worker && uv run pytest      # Python suite
```

`test` is the unit suite in every workspace and never starts a browser or a
dev server. The `e2e` job runs Playwright against `next dev` with real Postgres
and Redis service containers, applying migrations first.

## Coverage floors

Each suite fails below its floor, so adding code without tests can break the
build even when your own tests pass. The floors are **starting points set just
below what the suite measured when it was written, not targets**. They exist to
catch a drop, so raise them as coverage grows.

Recorded in each `vitest.config.ts` under `coverage.thresholds`, and for the
worker in `pyproject.toml` under `--cov-fail-under`:

| Workspace            | Lines | Statements | Functions | Branches | Measured when set |
| -------------------- | ----: | ---------: | --------: | -------: | ----------------: |
| `apps/web`           |   15% |        15% |       25% |        . |             17.9% |
| `packages/config`    |   90% |        90% |       90% |      75% |              100% |
| `packages/contracts` |   90% |        90% |       90% |        . |              100% |
| `packages/jobs`      |   80% |        80% |       90% |      90% |             85.7% |
| `apps/worker`        |   45% |          . |         . |        . |               50% |

A `.` means that metric is not gated. Note that `packages/jobs` gates functions
and branches at 90% even though its line floor is 80%, and `packages/config`
gates branches at 75%. Reading only the line column will surprise you.

`packages/db` and `packages/types` have no test script: `packages/db` builds a
PrismaClient at module scope and needs a real database, and `packages/types` is
types only, with no runtime code to execute.

### What is deliberately not measured

Counting code a suite is not meant to cover would make the percentage
meaningless, so these are excluded and gated elsewhere:

- **`apps/web` routes, pages and Server Actions**, the I/O boundary, gated by
  the Playwright `e2e` job. Coverage is scoped to `app/components/**` and
  `app/lib/**`.
- **`packages/jobs` `connection.ts` and `queue.ts`**, which construct the
  ioredis and BullMQ clients and cannot run without a live Redis.
- **`apps/worker` entry points and client wiring**, which reach out to Influx,
  MinIO and Redis and are covered by running the worker.
