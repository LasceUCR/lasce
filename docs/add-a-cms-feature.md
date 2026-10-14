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
  content with edit/delete affordances, and a drag handle with `drag` (see
  [Reordering items](#reordering-items)). Content-agnostic: it takes `onEdit`/`onDelete` callbacks
  and doesn't know what `children` is. Delete asks for confirmation first; there's no undo yet.
  Creating does not confirm: the "Añadir" form saves on "Confirmar". Editing a Nosotros activity
  still confirms ("Guardar cambios"). Cancel on a form that has unsaved changes asks first
  ("Descartar cambios no guardados"); an untouched form closes immediately. Report the outcome of
  a create, edit or delete with a toast that says what happened, or why it failed: see
  [`toasts.md`](toasts.md).
- `AddItemCard` (`apps/web/app/components/public/cms/AddItemCard.tsx`) — a "+" card that opens
  whatever form you pass it in a modal. Also content-agnostic.

The only new component per feature is one `Editable<Widget>Card`, the piece that knows both the
domain type and `useEditMode()` — see `EditableNewsCard.tsx` for the pattern: render the plain
content when edit mode is off, `EditableWrapper` + an edit modal when it's on.

## Reordering items

`EditableWrapper` can also reorder its item among its siblings: pass `drag` with the item's
`dragId`, the `positionField` its table stores the order in and the item itself as `record`, and
a handle appears beside the other actions. It works with a pointer, a finger or
the keyboard (Space or Enter to pick up, the arrow keys to move, Space or Enter to drop, Escape
to cancel). The wrapper only makes the item sortable; the list around it owns the rest with
[`@dnd-kit`](https://dndkit.com):

```tsx
<DndContext
  accessibility={{ announcements, screenReaderInstructions }}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
  sensors={sensors}
>
  <SortableContext items={ids} strategy={rectSortingStrategy}>
    {widgets.map((widget) => (
      <EditableWrapper
        drag
        dragId={widget.id}
        dragLabel={t('reorder', { title: widget.title })}
        dragRoleDescription={t('reorderRole')}
        positionField="position"
        record={widget}
        key={widget.id}
        onEdit={() => edit(widget)}
      >
        <WidgetCard {...widget} />
      </EditableWrapper>
    ))}
  </SortableContext>
</DndContext>
```

- `dragLabel` names the handle ("Reordenar Noticia X"); `dragRoleDescription` is how assistive
  technology calls it ("reordenable"). Both default to Spanish; pass them in the page's language.
- `positionField` names the database column that stores the order. It is required with `drag`,
  so every draggable list says which column it saves to. Most dynamic content has no such
  column yet: give the table one (unique, with `@default(autoincrement())` so a new row lands
  last), send it with each item, and name it here.
- `record` is the item as loaded. The handle only shows when `record[positionField]` is a number:
  an item whose table has no such column, or whose service does not send it, keeps its other
  actions and is not draggable. That is the check that the field exists; there is no handle that
  would move a card and then fail to save. `onDragEnd` reads it from
  the dragged item as `active.data.current.positionField` (`EditableDragData`) and sends it with
  the order. It comes from the browser, so the route must accept only the table's real position
  columns, as `indicatorOrderSchema` does.
- A unique position cannot be swapped row by row. Write the new order in one transaction, moving
  every row to a temporary negative position first (see `reorderIndicators` in
  `app/lib/home.ts`).
- In `onDragEnd`, move the item in local state at once, save the new order, and put it back if
  the save fails. Report the outcome with a toast through `useRequestFeedback`.
- Give `DndContext` an `id` from `useId()` and announcements in the page's language.

## Making the content bilingual

If the widget's text must exist in Spanish and English, keep everything above and follow
[`translate-database-content.md`](translate-database-content.md). It adds, on top of these
building blocks:

- `LanguageTabs` and `TranslationReview` (`apps/web/app/components/public/cms/`): the editor's
  language tabs and the cross-language review switch.
- `apps/web/app/lib/i18n/content/`: the field definition, its Zod schema, the review rule,
  reading with fallback and the form helpers.
- `apps/web/app/lib/cms/`: the API's JSON error envelope, `runWrite` for transactions,
  `updated_at` as the version for optimistic concurrency, and the client's `sendJson` and error
  mapping. These are useful to a single-language feature too.

Publications (`/publicaciones`) are the reference implementation.
