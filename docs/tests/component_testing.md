# Testing components and services

`apps/web` runs its unit tests on **Vitest with React Testing Library and jsdom**, configured in
`apps/web/vitest.config.ts`. This page is about UI components; for where a test file belongs in
any other workspace, and for the Playwright and pytest suites, see
[`docs/testing.md`](../testing.md). Component tests exist for `WorkAreaCard` and `WorkAreasSection`.
Follow the structure below so tests stay consistent across the app.

## Setup

- **Framework**: Vitest + React Testing Library, jsdom environment. Vitest over `node:test`
  because components need a DOM and a JSX transform that `node:test` doesn't provide out of the
  box; Testing Library over shallow rendering because what matters is what the user sees and can
  click, not internal state. Vitest is pinned to 4.x to stay compatible with Storybook 10.
- **JSX**: the Next tsconfig sets `jsx: "preserve"`, so `vitest.config.ts` sets
  `oxc: { jsx: { runtime: 'automatic' } }`. Without it Vite 8 leaves the JSX in place and the
  test files fail to parse.
- **Location**: colocated, same folder as the component — `app/components/public/WorkAreaCard.tsx` →
  `app/components/public/WorkAreaCard.test.tsx`. No `__tests__` folder: touching the component and
  forgetting the test should be one `git status` glance apart.
- **Naming**: `<Component>.test.tsx`, one file per component. Test names read as behaviour, not
  implementation — `'shows an error when the list is empty'`, not `'renders correctly'`.
- **Style**: `describe` blocks with flat `test()` calls, never `it()`, and named imports from
  `vitest`.

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

This is the pattern for a component whose I/O boundary is a Server Action plus a polling
`fetch`, illustrated with a stand-in `JobLauncher` component (mock the action import and `fetch`,
never `@lasce/contracts`):

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { JobLauncher } from './JobLauncher'
import * as actions from '../actions'

afterEach(() => vi.restoreAllMocks())

test('renders the empty state when there is nothing to launch', () => {
  render(<JobLauncher items={[]} />)
  expect(screen.getByText(/nothing to launch yet/i)).toBeInTheDocument()
})

test('enqueues the job for the selected item and shows the job id', async () => {
  vi.spyOn(actions, 'enqueueJob').mockResolvedValue({ ok: true, jobId: 'job-123' })
  const user = userEvent.setup()

  render(<JobLauncher items={[{ id: '1', name: 'Item 1' }]} />)
  await user.click(screen.getByRole('button', { name: /enqueue/i }))

  await waitFor(() => expect(screen.getByText('job-123')).toBeInTheDocument())
  expect(actions.enqueueJob).toHaveBeenCalledWith('some-job', expect.objectContaining({ id: '1' }))
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

## Translated components

See ["Where a string goes"](../add-a-component.md#where-a-string-goes) for which components read
from the message catalogue versus taking copy through props. Testing the two sides of the
server/client boundary differs because there's no official recipe for `getTranslations` under
Vitest — it needs a Next.js request scope that doesn't exist in a unit test.

- **Server Components** (`getTranslations`, e.g. `SkipLink.test.tsx`): mock `next-intl/server` with
  a real translator built from the actual catalogue, so the assertion stays honest about the key
  existing rather than testing a stand-in string:

  ```tsx
  vi.mock('next-intl/server', () => ({
    getTranslations: async (namespace: NamespaceKeys<Messages, NestedKeyOf<Messages>>) =>
      createTranslator({ locale: 'es', messages: es, namespace }),
  }))
  ```

  `createTranslator`'s `Namespace` generic rejects a bare `string`, so the mock has to name the
  type next-intl uses for it — `NamespaceKeys`, `NestedKeyOf` and `Messages` all come from
  `next-intl`.

- **Client Components** (`useTranslations`, e.g. `JobLauncher.test.tsx`): wrap the render in
  `NextIntlClientProvider` with the real `es` catalogue — no mocking needed, since the provider is
  a real (if minimal) implementation:

  ```tsx
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <JobLauncher devices={[]} />
    </NextIntlClientProvider>,
  )
  ```

Assert the rendered Spanish text (`es` is the default locale), not the translation key — the point
of the test is that the real copy reaches the screen.
## Service tests

Non-UI code under `app/services/**` is tested from `apps/web/tests/unit/`, mirroring the source
path — `app/services/storage/implementations/MinioAsssetStorage.ts` →
`tests/unit/services/storage/MinioAssetStorage.test.ts`. These have no component to colocate with,
and grouping them keeps the service suite readable as a whole.

The boundary to mock is the **SDK**, not the service. `MinioAssetStorage` builds its own
`Minio.Client` in a no-argument constructor, so there is no injection seam; mock the module and
hold the stubs at module scope so every instance shares them:

```ts
const putObject = vi.fn()
const bucketExists = vi.fn()

vi.mock('minio', () => ({
  Client: class {
    putObject = putObject
    bucketExists = bucketExists
  },
}))
```

Two habits that matter for services reading `process.env` directly:

- **Know when each variable is read.** `MinioAssetStorage` captures the endpoint and credentials
  at construction but reads bucket names per call, so stub with `vi.stubEnv` _before_ constructing,
  and `vi.unstubAllEnvs()` in `afterEach`.
- **Never let ambient environment decide a result.** Stub the variable explicitly even when
  asserting a fallback, so the test means the same thing on a machine with a populated `.env`.

Assert the calls made into the mocked SDK and the value returned — and, where the point of the code
is that something _doesn't_ happen, assert the absence: the upload tests check that an invalid file
leaves `bucketExists` and `putObject` uncalled, which is the whole guarantee of validating first.

Tests pin **current** behaviour. Where the implementation and its own doc comment disagree, the
test follows the implementation and the gap is recorded in
[manage-assets.md](../manage-assets.md#known-gaps) rather than quietly fixed in a test change.

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
`playwright.config.ts`. The Vitest `include` matches `app/**/*.test.{ts,tsx}` and
`tests/unit/**/*.test.{ts,tsx}`; Playwright's specs are named `*.spec.ts`, so even though Vitest
now looks inside `tests/`, the two suites cannot pick up each other's files.

## Coverage thresholds

`apps/web` gates 15% lines, 15% statements and 25% functions, measured over
`app/components/**` and `app/lib/**` only. Routes, pages and Server Actions are the I/O boundary
and are gated by the Playwright `e2e` job instead, so counting them here would measure that
suite's work as a gap in this one.

The floors for every workspace, including the function and branch thresholds that the line
percentage does not tell you about, are in [`docs/testing.md`](../testing.md).
