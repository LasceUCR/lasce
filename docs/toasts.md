# Toasts

A toast is a short notification that reports the outcome of something the user just did: a
card was created, a change was saved, or a request failed and why. Toasts are the standard for
that kind of feedback in this app (see **Feedback** in [`AGENTS.md`](../AGENTS.md)).

The code is in `apps/web/app/components/public/toast/`:

| File                | Role                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `ToastProvider.tsx` | Holds the toasts, exposes `useToast()`, renders the page-level region  |
| `ToastOutlet.tsx`   | A second place toasts can render; `Modal` mounts one inside its dialog |
| `ToastRegion.tsx`   | The fixed stack and its two live regions                               |
| `Toast.tsx`         | One notification: icon, message, close button                          |

`ToastProvider` is mounted once in `app/layout.tsx` and in the Storybook preview, so any client
component can call `useToast()` without wrapping itself. A test that renders such a component
wraps it in `<ToastProvider>` (inside `renderWithIntl`, since the close button is translated).

## Using it

```tsx
const toast = useToast()

toast.show('success', t('created'))
const id = toast.show('error', reason)
toast.dismiss(id)
```

- `show(tone, message)` takes `'success'` or `'error'` and returns an id.
- **Success** toasts disappear after 5 seconds (`SUCCESS_TOAST_DURATION_MS`).
- **Error** toasts stay until the user closes them, or until the code dismisses them. An error
  usually has to be read and acted on, so it is not put on a timer (WCAG 2.2.1).
- Messages are plain text. Put new client-side copy in the message catalogue.

## Saying why something failed

An error toast should explain the failure, not just say that it happened. Route handlers here
answer a failure with `{ error }`, and a validation failure adds `issues`
(`parsed.error.flatten().fieldErrors`). `readFailureReason(response)` in
`app/lib/api-feedback.ts` turns that into one sentence, field messages included, and returns
`null` when the body says nothing usable (not JSON, an HTML error page). Fall back to a
translated message chosen by what went wrong:

```ts
let response: Response
try {
  response = await fetch(url, { method: 'POST', body: JSON.stringify(values) })
} catch {
  toast.show('error', t('errors.network')) // the request never reached the server
  return
}

if (!response.ok) {
  const reason =
    (await readFailureReason(response)) ??
    (response.status >= 500 ? t('errors.server') : t('errors.unknown'))
  toast.show('error', reason)
  return
}
```

For the server side to have a reason to give, a route handler catches a database failure and
answers with a JSON 500 that says so, rather than letting the throw become Next's HTML error
page. `app/api/nosotros/activities/` does both.

Keep the form open on failure, with the user's input in it, and only close it and call
`router.refresh()` once the request succeeded. If the user can retry, dismiss the previous error
before the next attempt so errors do not pile up. `NosotrosPage.tsx` (`submitActivity`) is the
reference implementation.

## Why there is an outlet inside `Modal`

`Modal` opens with `showModal()`. That puts the dialog in the browser's top layer and makes the
rest of the document **inert**: an element outside the dialog cannot be clicked or focused, and
screen readers do not announce it, even if it is drawn above the dialog. Most failures happen
while a form is open in a modal, so a toast region in `<body>` would be useless exactly when it
is needed.

So `Modal` renders a `<ToastOutlet />` inside its `<dialog>`. Each outlet registers with the
provider when it mounts, and the toasts render in the most recently registered one (the
topmost open modal), or in the provider's own region when no modal is open. Nested modals
(`ConfirmDialog` over an edit form) work the same way.

When a modal closes:

- an **error** shown while it was on top is dropped, because it was about that modal's form;
- a **success** shown as it closes (the usual "saved, close the form" sequence) moves to the
  page region.

Without a `ToastProvider`, `ToastOutlet` renders nothing, so `Modal` still works on its own in
tests and stories.

## Accessibility

Each region has two live regions that stay mounted while empty: errors go in an
`aria-live="assertive"` one, successes in an `aria-live="polite"` one. A screen reader only
announces a change to a live region that already exists, so they are never inserted together
with their content. The toasts themselves carry no ARIA role, which keeps them out of
`getByRole('alert')` queries in tests; assert them by their text instead, and use `within(dialog)`
to check that an error rendered inside the open modal.

## Toast or inline message?

| Use a toast for                                           | Keep it inline for                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| The outcome of an action: created, saved, deleted, failed | Validation of one field, next to it (`FormField`)                  |
| A failure the user can retry or act on                    | A page state: empty list, loading, a data source notice (`Notice`) |
|                                                           | Anything that must stay visible while the user reads the page      |

Sections built before toasts still report outcomes with inline `form-alert` paragraphs. Move a
section over when you next work on it; do not add new inline outcome messages.
