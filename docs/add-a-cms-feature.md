# Adding a CMS-editable feature

"CMS" here means letting an `ADMIN` account edit a piece of public content in place, behind the
"Modo edición" toggle in `/administracion` (for now, at least), instead of hand-editing hardcoded content in the
repository. The building blocks already exist and are shared by every feature that uses this
pattern. Adding a new one is mostly wiring, not new UI.

Reach for this pattern when the content is public-facing and editorial (an admin should be able to
change wording, add an item, remove one) without a developer touching code. It's the wrong tool for
data that already has its own admin surface (like user role assignment) or anything that isn't
meant to be end-user-editable.

Say you are adding CMS editing to some list of `Widget`s.

## The shared building blocks (already built, don't duplicate)

- `EditModeProvider` / `useEditMode()` (`apps/web/app/components/public/cms/EditModeProvider.tsx`)
  — a global, `localStorage`-backed `editMode` boolean, mounted once in `apps/web/app/layout.tsx`.
  Any component reads it with `useEditMode()`.
- `EditableWrapper` (`apps/web/app/components/public/cms/EditableWrapper.tsx`) — wraps a piece of
  content with edit/delete affordances. Content-agnostic: it takes `onEdit`/`onDelete` callbacks
  and doesn't know what `children` is. Delete asks for confirmation first; there's no undo yet.
- `AddItemCard` (`apps/web/app/components/public/cms/AddItemCard.tsx`) — a "+" card that opens
  whatever form you pass it in a modal. Also content-agnostic.

The only new component per feature is one `Editable<Widget>Card`, the piece that knows both the
domain type and `useEditMode()` — see `EditableNewsCard.tsx` for the pattern: render the plain
content when edit mode is off, `EditableWrapper` + an edit modal when it's on.
