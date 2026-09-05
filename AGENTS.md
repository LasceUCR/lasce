# AGENTS.md

Working notes for coding agents in this repository. Humans are welcome to read it too: it is
the short version of what is in `docs/`, plus the things that are easy to get wrong.

Start with [`README.md`](README.md) for what the project is, and
[`docs/architecture.md`](docs/architecture.md) for how the pieces fit. This file assumes both.

## The shape of the thing

`lasce` is the public site and data platform for the **Laboratorio de Ciencias Espaciales de la
Universidad de Costa Rica**. It is a pnpm + Turborepo monorepo with two runtimes that share one
Redis queue:

| Path                     | Runtime              | Role                                                   |
| ------------------------ | -------------------- | ------------------------------------------------------ |
| `apps/web`               | Next.js 16, React 19 | UI + route handlers. **Produces** jobs, never consumes |
| `apps/worker`            | Python 3.13, uv      | BullMQ consumer + scheduled processing                 |
| `packages/contracts`     | TypeScript           | Zod job payloads, exported to JSON Schema              |
| `packages/jobs`          | TypeScript           | Queue, typed `enqueue()`, declared schedules           |
| `packages/db`            | Prisma               | **The only** migration source for PostgreSQL           |
| `packages/config`        | TypeScript           | Shared tsconfig + `serverEnv()` validation             |
| `packages/types`         | TypeScript           | Pure types, no runtime code                            |
| `packages/eslint-config` | n/a                  | Shared flat configs                                    |

Stores: PostgreSQL (relational), Redis (queue transport), InfluxDB 3 (time series, worker only),
MinIO (files).

The public site is **in Spanish** (`<html lang="es">`, routes like `/clima-espacial`,
`/investigacion`). Keep user-facing copy in Spanish; keep code, comments and commits in English.

## Commands

```bash
pnpm install && pnpm worker:install    # Node deps, then `uv sync` for the worker
pnpm services:up                       # Postgres, Redis, InfluxDB, MinIO via Docker Compose
pnpm db:migrate                        # Prisma migrations

pnpm dev                               # Next.js on :3000
pnpm worker:dev                        # Python worker, second terminal

pnpm turbo run lint typecheck test     # what you run before pushing
pnpm --filter @lasce/web test:unit     # fast loop, no coverage
pnpm --filter @lasce/web test:e2e      # Playwright, needs Postgres and Redis
pnpm --filter @lasce/web storybook     # :6006
cd apps/worker && uv run pytest        # Python suite
```

`pnpm lint typecheck test` covers `ruff`, `mypy` and `pytest` too, because the worker is wired into
Turborepo through a `package.json` that shells out to `uv`.

Requires Node 22+ (`.nvmrc`), pnpm 10, and [uv](https://docs.astral.sh/uv/).

## Git workflow, enforced rather than advisory

Read [`docs/git-guidelines.md`](docs/git-guidelines.md) once in full. The short version:

- **Never commit or push to `main` or `development`.** Both are protected by committed rulesets
  (`.github/rulesets/`) with **nobody on the bypass list**, admins included. A direct push is
  rejected with `GH013`.
- Branch from `development`. Name it `<type>-<group>-<description>`, lowercase and hyphenated:
  `feature-g01-user-login`, `fix-g02-email-validation`. Types: `feature` `fix` `hotfix`
  `refactor` `docs` `test` `chore`. `hotfix` branches come from `main`.
- Commits: `<type>(<module>): <description>`, for example `feat(auth): add user login`. The
  description starts with a verb, is lowercase, and has no trailing period.
- PR titles add the group: `feat(auth): implement user login [g01]`.
- Fill in every section of `.github/PULL_REQUEST_TEMPLATE.md`. Write `None` rather than deleting
  a section.
- Squash merge only. `development` needs 1 approval, `main` needs 3, at least one from a
  `.github/CODEOWNERS` owner. **Pushing a new commit dismisses existing approvals.**
- Never commit `.env` or any credential.

If you have already committed to a protected branch locally, move the work rather than forcing:

```bash
git branch feature-g01-my-change
git reset --hard origin/development
git checkout feature-g01-my-change
```

## What has to pass

Eight required checks, all from [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

```
lint  typecheck  test  build  worker  e2e  docker (web)  docker (worker)
```

`lint` also runs `pnpm format:check`, so unformatted code fails the build. Run `pnpm format`.

## Code conventions

**TypeScript.** Prettier with **no semicolons**, single quotes, 100 columns, trailing commas
(`.prettierrc.json`). ESLint flat config from `@lasce/eslint-config`;
`@typescript-eslint/consistent-type-imports` is an **error**, so type-only imports must be
`import type`. Unused names are allowed only with a leading underscore. No `any` in component
props: give every component a typed `Props` interface.

**Python.** ruff (line length 100, target `py313`, rules `E F I B N UP SIM RUF ASYNC`) and mypy
`strict = true`. The InfluxDB, MinIO and BullMQ SDKs ship no types and are excluded from
`no-untyped-call`, but your code around them is still checked. The worker runs on asyncio: Postgres
access is async throughout (SQLAlchemy over psycopg 3), and the synchronous Influx/MinIO SDKs are
pushed onto threads in `app/clients/`. Do not call a blocking SDK directly from a processor.

**Components.** `apps/web/app/components/`, one `PascalCase.tsx` per component. Keep them
presentational: data and callbacks arrive through props rather than the component reaching into
Server Actions or `@lasce/*`. Co-locate a `.stories.tsx` with one story per meaningful state.
See [`docs/add-a-component.md`](docs/add-a-component.md).

## Tests

Full rules in [`docs/testing.md`](docs/testing.md) and
[`docs/tests/component_testing.md`](docs/tests/component_testing.md). The parts that bite:

- **TypeScript tests sit next to the code they test.** `apps/web/app/**/*.test.tsx`,
  `packages/<pkg>/src/**/*.test.ts`. There is no `__tests__` folder anywhere. The exception is
  non-UI service code, which lives in `apps/web/tests/unit/` mirroring the source path.
- **Playwright and pytest get their own directory**: `apps/web/tests/e2e/*.spec.ts`,
  `apps/worker/tests/test_*.py`.
- `.test.ts(x)` and `.spec.ts` are **not** interchangeable. That naming split is the only thing
  keeping `turbo run test` from launching a browser.
- **A test outside the `include` glob is never collected and never errors.** It silently gates
  nothing. If a new test passes instantly, check that it ran.
- Use `describe` + flat `test()`, never `it()`. Name tests as behaviour.
- Assert roles and user-visible text (`getByRole`, `getByText`), not CSS classes or DOM shape.
- **Mock** the Server Action boundary and `fetch`; for services, mock the **SDK** at the module
  boundary. **Never mock `@lasce/contracts`**, because real validation is the entire point of it.
- Reuse a story's `args` as the test fixture. Do not use Storybook's `composeStories`; the
  portable-stories runtime needs a Vite plugin the Vitest config does not load.
- Coverage floors gate every suite, so adding code without tests can break the build even when
  your own tests pass. **Read the floor from `vitest.config.ts` / `pyproject.toml`, not from the
  table in `docs/testing.md`**, which lags the configs. Floors ratchet upward; raise one
  when you raise coverage, never lower it to pass.

## Crossing the language boundary

Job payloads are defined **once**, in `packages/contracts/src/jobs.ts`, and exported to JSON
Schema that the Python side validates itself against. `apps/worker/tests/test_contracts.py`
asserts the registry and the exported contracts describe the same set of jobs, so a change made
on one side only fails the suite instead of failing in production.

Adding or changing a job means all of these, in order
([`docs/add-a-job.md`](docs/add-a-job.md) has the code):

1. `packages/contracts/src/jobs.ts`: add to `JOB_NAMES` and `jobPayloads`.
2. `pnpm contracts:export`: **commit the generated JSON**; it is the artefact Python checks.
3. `apps/worker/app/models/jobs.py`: mirror as a Pydantic model. Use `alias=` for camelCase
   fields; the payload arrives exactly as the producer sent it.
4. `apps/worker/app/processors/<name>.py` + `app/processors/__init__.py`.
5. `apps/worker/app/registry.py`: register it.
6. `apps/worker/tests/test_contracts.py`: add an example payload.

Recurring jobs are _declared_ in `packages/jobs/src/schedules.ts`. How they fire (BullMQ's
scheduler via `pnpm jobs:register`, or an external cron hitting
`POST /api/jobs/[name]/trigger` with `Authorization: Bearer $CRON_SECRET`) is a deliberately
open decision. Both are wired. Changing the mechanism must change nothing in the processors.

## Database ownership

**Prisma is the only migration source.** The worker reads and writes the same tables through
SQLAlchemy but never migrates them. Two consequences when touching `packages/db/prisma/schema.prisma`:

- Ids default to `gen_random_uuid()` in PostgreSQL, **not** Prisma's `cuid()`. A cuid is
  generated inside the Prisma client, which would leave the worker unable to insert a row.
- `@updatedAt` is applied by the Prisma client too, so those columns also carry `@default(now())`
  and the worker sets them explicitly.

## Environment

Every process reads the single `.env` at the repository root. It is validated **twice**: by
`packages/config/src/env.ts` (Zod) and by `apps/worker/app/settings.py` (pydantic-settings). Adding a
variable means updating `.env.example` **and both validators**; each file's header says so.

## Traps

- `packages/db/generated/` is gitignored and produced by `prisma generate`. Turbo's `typecheck`
  and `test` tasks `dependsOn: ["^build"]` so it exists first. Bypassing turbo and calling `tsc`
  directly will fail on a clean checkout.
- `apps/web/app/services/storage` is **a service layer with no caller yet, and it is unfinished**.
  It has eight recorded defects, including a constructor that throws under the documented
  `MINIO_ENDPOINT` value and a `delete` with no prefix guard that will happily remove the worker's
  `readings/*` objects. Its tests pin _current_ behaviour, not intended behaviour. Read
  [`docs/manage-assets.md#known-gaps`](docs/manage-assets.md#known-gaps) before building on it,
  and fix the gap rather than changing a test to match.
- Where an implementation and its own doc comment disagree in that module, the code is the truth
  and the gap is recorded in `manage-assets.md`. Do not quietly "fix" it in a test.
- A required check stuck at _"Expected"_ did not run, usually because a workflow was renamed
  without updating the ruleset. Raise it; waiting will not help.
- Edit `.github/rulesets/*.json` through a PR. Editing a ruleset in the GitHub UI makes the
  committed files stale and gets reverted on the next apply.

## Before opening a PR

```bash
pnpm format
pnpm turbo run lint typecheck test
pnpm --filter @lasce/web test:e2e     # if you touched routes, pages or Server Actions
```
