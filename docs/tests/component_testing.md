# Testing UI components

`apps/web` has no test runner configured yet — `JobLauncher.tsx` is the only interactive
component and it currently has zero coverage. This is the structure to follow once component
tests are added, so they stay consistent across the app.

## Setup

- **Framework**: Vitest + React Testing Library. Vitest over `node:test` because components need
  a DOM (`jsdom`/`happy-dom`) and a JSX transform that `node:test` doesn't provide out of the box;
  Testing Library over shallow rendering because these are Server Action–driven components — what
  matters is what the user sees and can click, not internal state.
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

## Running

Once Vitest is added to `apps/web/package.json` as a `test` script, it's picked up automatically
by the shared pipeline:

```bash
pnpm --filter web test     # just the web app
pnpm turbo test            # every package that defines a test script
```
