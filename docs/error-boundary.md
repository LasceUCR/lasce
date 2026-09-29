# ErrorBoundary

`app/components/public/ErrorBoundary.tsx` catches a render-time error thrown by its
subtree and shows a fallback instead, so one broken widget cannot take the rest of the
page down with it. It exists because a dynamically imported component's import can
reject, and a third-party library that reads a browser-only global (Leaflet, in this
codebase) can throw during render — neither should blank the entire page.

## API

```tsx
<ErrorBoundary fallback={<SomeFallback />}>
  <PotentiallyBrokenWidget />
</ErrorBoundary>
```

- `fallback: ReactNode` — rendered instead of `children` once a descendant throws
  during render.
- `children: ReactNode` — the subtree being protected.

## When to reach for it

Wrap a widget that can throw for reasons outside this app's own control: a
third-party library that assumes a browser global, a dynamically imported
component whose import itself can reject, or any subtree whose failure
shouldn't take the rest of the page down with it (surrounding layout,
navigation, unrelated sections). Keep the wrapped subtree as small as the
failure you're isolating — wrapping an entire page mixes unrelated content
behind one fallback.

## What it doesn't catch

Being a class component using `getDerivedStateFromError`, it only catches
errors thrown while rendering its subtree. It does not catch errors in event
handlers, in asynchronous code (`setTimeout`, promises, `fetch` callbacks),
during server-side rendering, or thrown by the boundary itself. Those still
need their own handling — a `try/catch`, a `.catch()`, or local error state.

It is a class component because there is no hook equivalent for
`getDerivedStateFromError`; every other component in this codebase is a
function component.

## Current usage

Used twice in the ROSAC location map (see `docs/rosac-location.md`): once in
`RosacLocationMapLoader`, around the dynamically imported map component
(catching a rejected import), and once inside `RosacLocationMap`, around the
rendered Leaflet subtree (catching a render-time failure from the library
itself). Both fall back to `LocationUnavailable`.

## Verification

`ErrorBoundary` has no dedicated test file; it is exercised indirectly through
its two consumers — `RosacLocationMapLoader.test.tsx` (simulated failed
dynamic import) and `RosacLocationMap.test.tsx` (simulated render failure). A
future reuse should add its own fallback-specific test rather than relying on
another feature's coverage.
