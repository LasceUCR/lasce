# Adding a component

Reusable UI lives in `apps/web/app/components/`, one file per component,
named `PascalCase.tsx`. A component belongs there once it is used in two or
more places, or once it encapsulates a distinct enough piece of UI/behavior
that isolating it makes the surrounding code easier to read — it is not a
rule to split everything up front.

Say you are adding a `Button`.

## 1. Define the component

`apps/web/app/components/Button.tsx`:

```tsx
'use client'

interface ButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
```

Give every component a typed `Props` interface — no `any`. `JobLauncher.tsx`
in the same directory is the existing reference point for this app's current
conventions (client component, inline styling).

## 2. Keep it presentational

Pass data and callbacks in through props rather than reaching into server
actions or `@lasce/*` packages directly inside the component. A component
that only depends on its props can be rendered with mock data in Storybook
and reused anywhere without dragging its call site's dependencies along.

## 3. Add a story

Co-locate a `.stories.tsx` file next to the component:

`apps/web/app/components/Button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from './Button'

const meta: Meta<typeof Button> = { component: Button }
export default meta

export const Default: StoryObj<typeof Button> = { args: { label: 'Save' } }
```

Add one story per meaningfully different state the component can be in
(default, disabled, empty, error, ...) rather than just the happy path.

Storybook is already configured (`apps/web/.storybook`, framework
`@storybook/nextjs-vite`). Run it with:

```bash
pnpm --filter @lasce/web storybook
```

## 4. Add a test

Co-locate a `.test.tsx` beside the component and reuse the story's `args` as
the fixture, so the documented states and the asserted ones cannot drift:

`apps/web/app/components/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { Button, type ButtonProps } from './Button'
import { Default } from './Button.stories'

test('renders the label it was given', () => {
  render(<Button {...(Default.args as ButtonProps)} />)
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
})
```

Assert roles and user-visible text rather than CSS classes. See
[docs/tests/component_testing.md](tests/component_testing.md) for the full
conventions, including what to mock and the coverage thresholds.

## Verify

Confirm the story renders with no console errors, then run the checks:

```bash
pnpm --filter @lasce/web storybook
pnpm --filter @lasce/web test
pnpm turbo run lint typecheck
```
