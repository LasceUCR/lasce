# @lasce/contracts

The handshake between the TypeScript producer (`apps/web`) and the Python consumer
(`apps/worker`). Both ends put jobs on the same Redis queue, so the payload shape has to be
agreed somewhere — that somewhere is `src/jobs.ts`.

## What lives here

- `JOB_NAMES` — the closed set of job names. Adding a job starts here.
- `jobPayloads` — a Zod schema per job name. `enqueue()` and the HTTP trigger route both validate
  against it, so an invalid payload is rejected before it reaches Redis.
- `schema/*.json` — JSON Schema generated from those Zod schemas, committed to the repo.

## Keeping Python in sync

```bash
pnpm contracts:export
```

This regenerates `schema/*.json`. The worker mirrors each payload as a Pydantic model and
`apps/worker/tests/test_contracts.py` validates those models against the generated schema. If you
change a contract here and forget the Python side, that test fails — which is the whole point.

The schemas are exported with `io: 'output'`, because the producer parses the payload (applying
defaults) before adding the job, so the worker always receives the post-parse shape.
