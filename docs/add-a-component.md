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
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = { component: Button }
export default meta

export const Default: StoryObj<typeof Button> = { args: { label: 'Save' } }
```

Add one story per meaningfully different state the component can be in
(default, disabled, empty, error, ...) rather than just the happy path.

## Setting up Storybook (first time only)

Storybook is not installed in this repo yet. The first person to add a story
needs to bootstrap it once, from `apps/web`:

```bash
pnpm --filter @lasce/web dlx storybook@latest init
```

Accept the Next.js + TypeScript framework detection when prompted. After
that, everyone runs it locally with:

```bash
pnpm --filter @lasce/web storybook
```

Subsequent contributors just add `.stories.tsx` files next to their
components — the setup step does not need to be repeated.

## Verify

Run Storybook and confirm the new story renders with no console errors
before opening a PR:

```bash
pnpm --filter @lasce/web storybook
```

Then run the usual checks:

```bash
pnpm turbo lint typecheck
```
