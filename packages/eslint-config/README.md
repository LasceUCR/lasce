# @lasce/eslint-config

Shared ESLint flat configs.

| Export                      | Used by                                    |
| --------------------------- | ------------------------------------------ |
| `@lasce/eslint-config/base` | every TypeScript package under `packages/` |
| `@lasce/eslint-config/next` | `apps/web`                                 |

Each consumer re-exports it from its own `eslint.config.mjs`, so per-package overrides stay local.
