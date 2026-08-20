# @lasce/config

Cross-cutting configuration for the TypeScript side of the monorepo.

- `src/env.ts` — Zod-validated `process.env` for Node processes. Import it as
  `import { serverEnv } from '@lasce/config/env'`. It throws a single readable error listing
  every missing variable instead of failing deep inside a request.
- `tsconfig/*.json` — the base compiler options every package extends
  (`base.json`, `library.json`, `nextjs.json`).

The Python worker validates the same variables separately in `apps/worker/app/settings.py`.
When you add an environment variable, update `.env.example`, `src/env.ts`, and `settings.py`.
