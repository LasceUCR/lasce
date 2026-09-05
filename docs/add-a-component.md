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

### Where a string goes

That prop rule and user-facing copy pull in two directions, and both are
correct for what they cover. A leaf presentational component — `Button`,
`WorkAreaCard` — keeps taking its copy in through props, same as any other
data, so it stays renderable in Storybook with nothing behind it. A component
that owns its own chrome — a layout, or something like `JobLauncher` that is
the whole reason its route exists — reads its copy from the message
catalogue itself instead of threading translated strings through every
caller.

The catalogues live at `apps/web/messages/{es,en}.json`, one flat-ish object
per locale, namespaced by feature (`jobLauncher`, `layout`, `metadata`...).
`es` is the reference for key shape — it's the site's default locale, and
`global.d.ts` types every other catalogue and every `t('...')` call against
it, so an English catalogue missing a key or a typoed key in either language
is a type error, not a runtime surprise.

Read from the catalogue with:

```tsx
const t = await getTranslations('namespace') // Server Component
const t = useTranslations('namespace') // Client Component, under the root provider
```

`useTranslations` needs `NextIntlClientProvider`, which is mounted once in
the root layout (`apps/web/app/layout.tsx`) for every page — a Client
Component anywhere in the tree can call it without adding its own provider.

A missing key throws in development (so it's caught before it ships) and
renders the dotted key path (e.g. `jobLauncher.enqueue`) in production
instead of an empty node — see `app/lib/i18n.ts` for where both behaviours
are configured.

To test either side, see
[docs/tests/component_testing.md](tests/component_testing.md#translated-components).

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
