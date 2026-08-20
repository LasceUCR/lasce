# @lasce/db

PostgreSQL access for the TypeScript side, and the source of truth for the relational schema.

`prisma/schema.prisma` owns the tables and the migrations. The Python worker reads and writes the
same tables through SQLAlchemy (`apps/worker/app/db/models.py`) but **never migrates them** —
one owner for the schema avoids two migration histories fighting over the same database.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm db:generate` | Regenerates the client into `generated/client` |
| `pnpm db:migrate` | Creates and applies a migration in development |
| `pnpm --filter @lasce/db migrate:deploy` | Applies pending migrations (production) |
| `pnpm --filter @lasce/db seed` | Inserts the demo devices |
| `pnpm db:studio` | Opens Prisma Studio |

## Usage

```ts
import { prisma } from '@lasce/db'

const devices = await prisma.device.findMany()
```

The exported `prisma` is a singleton stashed on `globalThis` in development, so Next.js hot
reloads do not open a new connection pool on every edit.

## Notes on Prisma 7

- The generator is `prisma-client` (not `prisma-client-js`) and `output` is required.
- Prisma no longer loads `.env` on its own, so `prisma.config.ts` calls `dotenv` explicitly and
  points at the `.env` in the repository root.

## After changing a model

1. `pnpm db:migrate` — write the migration.
2. Mirror the change in `apps/worker/app/db/models.py`.
3. `pnpm typecheck` to pick up the regenerated types.
