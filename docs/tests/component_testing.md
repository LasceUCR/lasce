# Testing UI components

`apps/web` runs its unit tests on **Vitest with React Testing Library and jsdom**, configured in
`apps/web/vitest.config.ts`. Component tests exist for `WorkAreaCard` and `WorkAreasSection`;
`JobLauncher.tsx` is the largest component still without one, and is the next thing worth testing.
Follow the structure below so tests stay consistent across the app.

## Setup

- **Framework**: Vitest + React Testing Library, jsdom environment. Vitest over `node:test`
  because components need a DOM and a JSX transform that `node:test` doesn't provide out of the
  box; Testing Library over shallow rendering because what matters is what the user sees and can
  click, not internal state. Vitest is pinned to 4.x to stay compatible with Storybook 10.
- **JSX**: the Next tsconfig sets `jsx: "preserve"`, so `vitest.config.ts` sets
  `oxc: { jsx: 'react-jsx' }`. Without it Vite 8 leaves the JSX in place and the test files fail
  to parse.
- **Location**: colocated, same folder as the component — `app/components/JobLauncher.tsx` →
  `app/components/JobLauncher.test.tsx`. No `__tests__` folder: touching the component and
  forgetting the test should be one `git status` glance apart.
- **Naming**: `<Component>.test.tsx`, one file per component. Test names read as behaviour, not
  implementation — `'shows an error when the device list is empty'`, not `'renders correctly'`.

## What to mock, what not to

- **Mock** the Server Action import (e.g. `../actions`) and `fetch` for any status-polling route.
  These are the component's I/O boundary — a component test shouldn't need a running worker or
  database behind it.
- **Never mock** `@lasce/contracts`. The whole point of the shared contract is that the test
  exercises real validation, not a stand-in for it — if a payload shape is wrong, the test should
  fail the same way the real form submission would.

## What to assert

- Rendered states: empty state, pending/enqueueing, error message, terminal
  `completed`/`failed` styling.
- The sequence of calls into the mocked action/fetch, including the arguments passed — not
  internal `useState` values or component internals.
- User-visible text and roles (`getByRole`, `getByText`), not CSS classes or DOM structure.

## Example

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { JobLauncher } from './JobLauncher'
import * as actions from '../actions'

afterEach(() => vi.restoreAllMocks())

test('renders the empty state when there are no devices', () => {
  render(<JobLauncher devices={[]} />)
  expect(screen.getByText(/no devices yet/i)).toBeInTheDocument()
})

test('enqueues ingest-readings for the selected device and shows the job id', async () => {
  vi.spyOn(actions, 'enqueueJob').mockResolvedValue({ ok: true, jobId: 'job-123' })
  const user = userEvent.setup()

  render(<JobLauncher devices={[{ id: '1', externalId: 'device-001', name: 'Device 1' }]} />)
  await user.click(screen.getByRole('button', { name: /enqueue/i }))

  await waitFor(() => expect(screen.getByText('job-123')).toBeInTheDocument())
  expect(actions.enqueueJob).toHaveBeenCalledWith(
    'ingest-readings',
    expect.objectContaining({ deviceId: 'device-001' }),
  )
})
```

## Reusing the stories

A state worth documenting in Storybook is a state worth asserting, so import the story's `args`
and render the component with them. The two then cannot drift:

```tsx
import { WorkAreaCard, type WorkAreaCardProps } from './WorkAreaCard'
import { Default } from './WorkAreaCard.stories'

const defaultArgs = Default.args as WorkAreaCardProps
render(<WorkAreaCard {...defaultArgs} />)
```

Use the args rather than Storybook's `composeStories`. The portable-stories runtime needs
Storybook's own Vite plugin to resolve its internal `sb-original` aliases, which the Vitest config
does not load. Rendering with the args needs none of that, and `next/link` works under jsdom
without any Next mocks.

## Accessibility

Prefer `getByRole` and `toHaveAccessibleName` over `getByTestId` or class selectors: role queries
go through the accessibility tree, so they assert the semantics and the rendering at once. Where a
component wires up a relationship, assert it — `WorkAreasSection` links `aria-labelledby` to its
heading, and `WorkAreasSection.test.tsx` checks both that and the `useId()` fallback. Page-level
axe scanning already runs in the Playwright suite via `@axe-core/playwright`, so component tests
do not repeat it.

## Running

```bash
pnpm --filter @lasce/web test:unit   # fast loop, no coverage
pnpm --filter @lasce/web test        # with coverage and thresholds, what CI runs
pnpm --filter @lasce/web test:e2e    # Playwright, separate suite
pnpm turbo run test                  # every workspace
```

`test` is the unit suite in every workspace and never starts a browser or a dev server.
Playwright lives behind `test:e2e` and is confined to `apps/web/tests/e2e` by
`playwright.config.ts`; the Vitest `include` only matches `app/**/*.test.{ts,tsx}`, so the two
cannot pick up each other's files.

## Coverage thresholds

Thresholds are recorded per workspace in `vitest.config.ts` (`coverage.thresholds`), and for the
Python worker in `apps/worker/pyproject.toml` (`--cov-fail-under`). They are **starting floors set
just below what the suite measured when it was written, not targets**. They exist to catch a drop,
so raise them as coverage grows rather than leaving them where they are.

| Workspace            | Floor (lines) | Measured when set |
| -------------------- | ------------: | ----------------: |
| `apps/web`           |           15% |             17.9% |
| `packages/config`    |           90% |              100% |
| `packages/contracts` |           90% |              100% |
| `packages/jobs`      |           80% |             85.7% |
| `apps/worker`        |           45% |               50% |

### What is deliberately not measured

Counting code that this suite is not meant to cover would make the percentage meaningless, so
these are excluded and gated elsewhere:

- **`apps/web` routes, pages and Server Actions** — the I/O boundary, gated by the Playwright
  `e2e` job. Coverage is scoped to `app/components/**` and `app/lib/**`.
- **`packages/jobs` `connection.ts` and `queue.ts`** — construct the ioredis and BullMQ clients
  and cannot run without a live Redis.
- **`packages/db`** — builds a PrismaClient at module scope and needs a real database.
- **`packages/types`** — types only, with no runtime code to execute.
