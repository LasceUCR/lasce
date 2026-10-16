# Audit trail

`public.audit_events` records what happened in the portal, one append-only row per event. Today it
feeds the "Actividad reciente" panel of `/administracion` (LASCE-CON-012-151); a fuller audit view
can read the same table later. **Nothing records events yet**: the table, the writer and the panel
exist, and each feature adds its own call when it is ready. The columns are in
[database-definition.md](database-definition.md#audit_events).

## Recording an event

Call `recordAuditEvent()` from `apps/web/app/lib/audit-log.ts` where the action has succeeded, on
the server (a route handler or a Server Action):

```ts
import { recordAuditEvent } from '@/app/lib/audit-log'

await recordAuditEvent({
  action: 'publication.create',
  summary: `Publicación agregada: ${publication.title}`,
  actorType: 'user',
  actorId: user.id,
  entityType: 'publication',
  entityId: publication.id,
})
```

- `action` is `<entity>.<verb>`, lowercase with underscores (`user.role_change`). Anything else is
  rejected before the write. It is a plain string, so a new action needs no migration.
- `summary` is the line the panel shows. Write it when the event happens, with the name of what was
  touched, so it still reads after that record is deleted.
- `actorType` is `user` (with the account's `actorId`), `system` or `worker`. Deleting an account
  keeps its events and clears `actor_id`; the panel then names it "Cuenta eliminada".
- `metadata` takes any JSON worth keeping, such as the fields that changed. Never put a password,
  token or other secret in it.

`recordAuditEvent()` rejects when the write fails. To keep the event and the change it describes
together, pass the transaction client as the second argument, inside the same
`prisma.$transaction`. If the event should never undo the action, catch the rejection and log it.

Only `apps/web` writes this table. The worker does not mirror it, so a pipeline event is recorded
by the web, not by Python.

## The panel

`getRecentActivity()` reads the newest `RECENT_ACTIVITY_LIMIT` (5) events, and
`(public)/administracion/page.tsx` passes them to `RecentActivityPanel`, which shows each event's
summary, how long ago it happened and who did it. With no events it says "Aún no hay actividad
registrada.". The list area keeps the height of five rows (`.admin-activity-body` in
`globals.css`), so the card does not change size with fewer events or none; change both together.
