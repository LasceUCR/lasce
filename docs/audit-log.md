# Audit trail

`public.audit_events` records what happened in the portal, one append-only row per event
(LASCE-ADM-001-380). Every administrative action below records its event on the server, in the
transaction of the change. The events feed the "Actividad reciente" panel of `/administracion`
(LASCE-CON-012-151) and the Auditoría section. The columns are in
[database-definition.md](database-definition.md#audit_events).

## What is recorded

Only a **successful** action records an event. A request that fails validation, authorization or
the database write records nothing, because the event is written inside the same transaction as the
change: if either write fails, neither is kept. A delete that finds nothing to delete records
nothing either. The summaries are written in Spanish when the event happens.

| Action                                                                      | Where it is recorded                              | Metadata                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| `user.role_change`                                                          | `updateUserRole()` (`user-administration.ts`)     | `previousRole`, `newRole`                     |
| `role_permissions.update`                                                   | `updateRolePermissions()` (`role-permissions.ts`) | `role`, `added`, `removed` grants             |
| `news.create` `.update` `.delete`                                           | `news.ts`                                         | `fields` on update                            |
| `publication.create` `.update` `.delete`                                    | `publications.ts`                                 | `fields` on update                            |
| `research_area.create` `.update` `.delete`                                  | `research-areas.ts`                               | `fields` on update                            |
| `collaboration.create` `.update` `.delete`                                  | `collaboration-writes.ts`                         | `fields` on update                            |
| `contact_channel.create` `.update` `.delete`                                | `contact-channels.ts`                             | `fields` on update                            |
| `nosotros_activity.*`, `nosotros_researcher.*` (`create` `update` `delete`) | `nosotros.ts`                                     | `fields` on update                            |
| `rosac_researcher.create` `.update` `.delete`                               | `rosac.ts`                                        | `fields` on update                            |
| `gallery_album.*`, `gallery_sub_album.*`, `gallery_media.*`                 | `gallery.ts`                                      | `fields` on update, `albumId` on media create |
| `home_hero.update`, `geomagnetic_index.update`, `geomagnetic_index.reorder` | `home.ts`                                         | `fields`, `order`                             |
| `space_weather_section.update`                                              | `space-weather-section.ts`                        | `fields`                                      |
| `solar_physics_section.update`                                              | `solar-physics-section.ts`                        | `fields`                                      |

Download history is not here: it lives in `resource_downloads`. Worker and pipeline events are out
of scope. Metadata names the fields that changed, never their values, and never holds a secret.

### Recording from a CMS service

The route handler passes `guard.user` (from `requireApiPermission`) to the service, which records
inside its `runWrite` transaction with `recordUserAuditEvent(tx, actor, { ... })`.
`changedFieldNames(input)` gives the `fields` metadata of an update. A delete goes through
`runAuditedDelete()` (`cms/transaction.ts`), which reads the record's name first, deletes, and
records, so the summary still names what was removed.

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

## The Auditoría section

`/administracion/auditoria` (grant `view_audit_log`, held by administrators by default) lists the
events newest first, **10 per page** (`AUDIT_PAGE_SIZE`). `getAuditTrailPage()` in
`apps/web/app/lib/audit-trail.ts` counts the matching rows and reads only the rows of the page,
through the index on `created_at`. It checks the grant itself, so no caller can read the events
without it.

The filters are plain query parameters of a GET form, so applying them restarts at page 1 and the
page stays in the URL:

| Parameter | Meaning                                  |
| --------- | ---------------------------------------- |
| `from`    | First day, `yyyy-mm-dd`, Costa Rica time |
| `to`      | Last day (inclusive), `yyyy-mm-dd`       |
| `actor`   | Account id                               |
| `entity`  | Entity type, e.g. `news`                 |
| `action`  | Action, e.g. `news.create`               |
| `page`    | Page of the results, from 1              |

A value that is not valid means no filter. The filter lists offer only values that occur in the
trail. Events of a deleted account stay listed with the actor "Cuenta eliminada". The page text
follows the site's language (`administration.audit` in the catalogues), and so do the summaries
(see below). The trail is append-only: the portal has no way to edit or delete an event.

## Summaries in the site's language

The stored `summary` is Spanish and is written when the event happens. Both views render it through
`useAuditSummary()` (`components/administracion/`), which rebuilds the line from the event's
`action`, its `metadata` and the name of what was touched (the text after the first `": "` of the
stored summary), using `administration.auditSummary.events` in the catalogues. Keys are the action
with the dot replaced by an underscore (`news.create` → `news_create`). An action with no message
falls back to the stored summary, so a new action still shows something before it is translated.
When you record a new action, add its message to `es.json` and `en.json`, and keep the summary in
the form `<Noun> <verb>: <name>` so the name can be read back.

## The panel

`getRecentActivity()` reads the newest `RECENT_ACTIVITY_LIMIT` (5) events, and
`(public)/administracion/page.tsx` passes them to `RecentActivityPanel`, which shows each event's
summary, how long ago it happened and who did it. With no events it says "Aún no hay actividad
registrada.". The list area keeps the height of five rows (`.admin-activity-body` in
`globals.css`), so the card does not change size with fewer events or none; change both together.
