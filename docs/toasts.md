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

## Sending a request: `useRequestFeedback`

Most toasts report the outcome of a request to a route handler. Do not write that flow by hand:
`useRequestFeedback()` (`toast/useRequestFeedback.ts`) does it the same way for every section.

```tsx
const t = useTranslations('news')
const sendWithFeedback = useRequestFeedback()

async function handleCreate(values: NewsArticleFormValues, close: () => void) {
  await sendWithFeedback('/api/news', jsonRequest('POST', values), {
    success: t('created'),
    fallback: t('errors.saveUnknown'),
    onSuccess: () => {
      close()
      router.refresh()
    },
  })
}
```

What it does, in order:

1. Dismisses the error toast its previous attempt left, so retries do not pile up.
2. Sends the request.
3. On success, runs `onSuccess` (close the form, refresh the page), then shows `success`.
   Closing first means the success toast appears once, on the page, rather than inside a modal
   that is about to disappear.
4. On failure, shows an error toast and does nothing else, so the form stays open with the user's
   input and the page is not refreshed. The message is, in order of preference:
   - the reason the server gave, from `readFailureReason` (below);
   - `common.feedback.network` when the request never reached the server;
   - `common.feedback.server` for a 5xx with no usable body;
   - your `fallback` for anything else.

It resolves to whether the request succeeded. `NewsExplorer.tsx` and `NosotrosPage.tsx` use it for
create, edit and delete.

A component that hands the request to its parent takes a `close` callback rather than deciding
for itself when to close: see `onSave(values, close)` on `EditableNewsCard`, the same contract
`AddItemCard` gives its children.

## Saying why something failed

An error toast should explain the failure, not just say that it happened. Route handlers here
answer a failure with `{ error }`, and a validation failure adds `issues`
(`parsed.error.flatten().fieldErrors`). `readFailureReason(response)` in
`app/lib/api-feedback.ts` turns that into one sentence, field messages included, and returns
`null` when the body says nothing usable (not JSON, an HTML error page).
`useRequestFeedback` calls it for you; call it yourself only outside that hook.

For the server to have a reason to give, a route handler:

- catches a database failure and answers with a JSON 500 that says so, rather than letting the
  throw become Next's HTML error page;
- answers a conflict the user can fix with its own status and message, such as a 409 for a news
  link that is already used;
- validates an id before querying, so a malformed one is a 404 rather than a Prisma error;
- writes a record and its relations in one transaction, so a failure leaves the saved record
  unchanged.

`app/api/news/` and `app/lib/news.ts` do all four. A Server Action does the same through its
result: `uploadNewsImage` returns `{ ok: false, error }` with a reason in the admin's terms instead
of throwing or passing on a developer-facing message.

## Wording

Success messages name the thing and the outcome, in the same shape everywhere:

| Action | Pattern                                | Example                              |
| ------ | -------------------------------------- | ------------------------------------ |
| Create | `<Entidad> agregada correctamente.`    | Noticia agregada correctamente.      |
| Edit   | `<Entidad> actualizada correctamente.` | Actividad actualizada correctamente. |
| Delete | `<Entidad> eliminada correctamente.`   | Noticia eliminada correctamente.     |

A fallback error says what could not be done and invites a retry: "No se pudo guardar la noticia.
Inténtelo de nuevo." A server reason says why, and when it can, what to do next: "Ya existe una
noticia con este enlace. Use otro enlace o edite la noticia existente." The network and server
fallbacks are shared in `common.feedback`; per-section messages live under the section's
namespace (`news.*`, `nosotros.activities.*`).

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
