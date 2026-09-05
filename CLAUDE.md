# CLAUDE.md

The conventions for this repository live in one place, [`AGENTS.md`](AGENTS.md), so that every
agent and every human reads the same rules. Claude Code loads it through the import below.
**Put new project conventions there, not here.** This file is only for things specific to
working through Claude Code.

@AGENTS.md

## Working here

- **Never commit or push to `main` or `development`.** The repository rulesets reject it, with no
  bypass list. Create a branch named `<type>-<group>-<description>` (`feature-g01-...`) from
  `development` first. `.vscode/settings.json` sets
  `git.branchProtectionPrompt: alwaysCommitToNewBranch`, so a commit made on a protected branch is
  moved to a new one instead of failing later at push time.
- Only commit or push when asked. When you do, use the commit format from
  [`docs/git-guidelines.md`](docs/git-guidelines.md): `<type>(<module>): <description>`.
- Prefer `pnpm turbo run <task>` over calling a workspace's tool directly. Several tasks depend
  on `^build` for `prisma generate`, and skipping turbo fails on a clean checkout.
- Run the checks once, in the background, rather than polling:
  `pnpm turbo run lint typecheck test`. The Playwright suite is separate and needs Postgres and
  Redis (`pnpm services:up`).
- Do not read `apps/web/coverage/`, `packages/db/generated/`, `.turbo/`, `.next/`, `uv.lock` or
  `pnpm-lock.yaml` for context, because they are generated. Read the config that produced them.
- Coverage floors and lint settings are the source of truth over any table in `docs/`. If a doc
  and a config disagree, trust the config and say so.

## Documentation map

| Question                                    | File                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------- |
| How do the two runtimes fit together?       | [`docs/architecture.md`](docs/architecture.md)                       |
| How do I add a job across both languages?   | [`docs/add-a-job.md`](docs/add-a-job.md)                             |
| How do I add a UI component?                | [`docs/add-a-component.md`](docs/add-a-component.md)                 |
| Where does a test go, and what gates it?    | [`docs/testing.md`](docs/testing.md)                                 |
| How do I write a component or service test? | [`docs/tests/component_testing.md`](docs/tests/component_testing.md) |
| Branches, commits, PRs, required checks     | [`docs/git-guidelines.md`](docs/git-guidelines.md)                   |
| Pipelines, environments, secrets, rollback  | [`docs/deployment.md`](docs/deployment.md)                           |
| File uploads and their known defects        | [`docs/manage-assets.md`](docs/manage-assets.md)                     |
| Running the stack without Docker            | [`infra/docker/README.md`](infra/docker/README.md)                   |

When a change makes one of these wrong, update it in the same PR.
