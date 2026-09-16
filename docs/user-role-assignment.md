# User role assignment — mock UI

This implements the UI portion of **LASCE-ADM-001 User Role Assignment**, dependent on
PBI #79. It uses existing role identifiers and never creates roles or configures permissions.

## Interaction

- A user has at most one assigned role. Selecting another role opens a confirmation dialog;
  the saved indicator stays unchanged until confirmation succeeds. There is no actions column.
- The dialog names the user, current role, proposed role and its description. It explicitly
  explains replacement. **Sí, cambiar rol** confirms; **No, cancelar** or Escape dismisses.
- Selecting the current role opens a separate removal confirmation, as required by the PBI.
  Confirmation leaves the user without a role; no fallback role is silently assigned.
- The initial focus is on cancellation. Focus stays in the modal and returns to its trigger on close.
- Controls and dismissal are blocked while saving. Errors stay in the dialog, preserve the previous
  assignment, and allow retry or cancellation. Success closes it and announces the change by the name.
- Role descriptions are supplied as data: Visitante can visit/download; Asistente can edit content;
  Administrador has all administration functions, including assigning/revoking roles and editing.
  These descriptions do not implement authorization or permissions.
- The table remains read-only when no save callback is supplied. This is presentation behaviour,
  not an authorization boundary.

`UserRolesRow` receives the save callback through props and sends either one role ID or an empty
array for removal. The callback must resolve only after successfully saving and updating the supplied
user data, and reject without changing it on failure. `UserRoleAssignmentDemo` validates role IDs and
cardinality, simulates latency and updates fictional users only. Reloading resets all changes.
It makes no network requests and does not persist to local storage or a database.

Storybook `UserRoleAssignmentDemo/SaveFailure` simulates failed saves. The default story simulates
successful saves. `UserRolesRow/Saving` keeps a confirmed request pending to inspect disabled controls.
No failure-testing controls are added to the administration screen.

## Pending for completion

Real users and available roles, backend assignment operations, persistence after reload,
integration with the existing login and server-side authorization, integrated tests, and final
stakeholder validation of the interaction are still required. Creating authentication, role
catalogues or permission configuration is not implemented here. The editable mock view is public;
it must never be connected to real records without the authorization boundary.

## Verification

- Row and dialog tests: confirmation, cancellation, focus handling, role descriptions,
  duplicate submission prevention, failure and retry.
- Demo tests: exclusive replacement, user isolation, assignment to an unassigned user, removal,
  simulated failure and reset on remount.
- Chromium at 390 and 1440 CSS pixels: keyboard navigation, modal accessibility, cancellation,
  replacement, removal, loading, mock reset after reload and horizontal overflow.

Run the web unit suite and the targeted browser specs `users-overview.spec.ts`,
`user-role-assignment.spec.ts` and `administracion.spec.ts`. These validate the mock flow,
not real persistence or authorization.
