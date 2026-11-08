# Sessions

How a registered user signs in, what a session is, how a page requires one and how logout revokes
it (LASCE-SEC-008-072). Sign-in and sign-up share one page, `/acceso`; creating the account is
covered in [registration.md](registration.md).

## The pieces

| Piece                                                                        | File                                                                                                              | Covered by                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Access page (login and registration)                                         | `apps/web/app/(public)/acceso/page.tsx`                                                                           | Playwright (`tests/e2e/login.spec.ts`)  |
| Login and registration actions                                               | `apps/web/app/(public)/acceso/actions.ts`                                                                         | Playwright                              |
| Account page ("Mi cuenta")                                                   | `apps/web/app/(public)/cuenta/page.tsx`                                                                           | Playwright                              |
| Logout action                                                                | `apps/web/app/(public)/cuenta/actions.ts`                                                                         | Playwright                              |
| Login rules, messages, state                                                 | `apps/web/app/lib/auth/login.ts`                                                                                  | Vitest, colocated                       |
| Tokens, cookie flags, return paths                                           | `apps/web/app/lib/auth/session-token.ts`                                                                          | Vitest, colocated, no mocks             |
| Session store                                                                | `apps/web/app/lib/auth/session.ts`                                                                                | Vitest, `@lasce/db` and `next/*` mocked |
| Account cookie (display name only) and account copy                          | `apps/web/app/lib/auth/account.ts`                                                                                | Vitest, colocated                       |
| Header capabilities (`GET /api/session`)                                     | `apps/web/app/api/session/route.ts`, `apps/web/app/lib/auth/capabilities.ts`                                      | Vitest, colocated; Playwright           |
| Tab selector, login card, account links, sign-out dialog, hook, account card | `apps/web/app/components/public/auth/{AccessTabs,LoginForm,AccountLinks,SignOutButton,useAccount,AccountSummary}` | Vitest, stories as fixtures             |
| Table                                                                        | `auth.sessions`, see `database-definition.md`                                                                     | Prisma migration, worker model test     |

`/acceso` and `/cuenta` are the only dynamic pages besides `/investigacion`: they read the request's
cookies (and `/acceso` its query string), so they render per request and never at build time.
The page shows one card at a time behind a tab selector; `?tab=crear-cuenta` opens the registration
card and anything else the login card. `/login` and `/registro` are permanent redirects to `/acceso`
(`next.config.ts`), query string included, `/registro` landing on the registration tab. Every
other public page stays static; `getSessionUser` must never be called from the shared layout.

## Cookies

| Cookie          | Holds                            | Flags                                                                 | Read by                       |
| --------------- | -------------------------------- | --------------------------------------------------------------------- | ----------------------------- |
| `lasce_session` | random 32-byte token (base64url) | `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, 30 days | the server (`getSessionUser`) |
| `lasce_account` | JSON `{ name }`                  | same, minus `HttpOnly`                                                | the header, on the client     |

Both are set by `createSession` and removed by `deleteCurrentSession`, and only there: Next only
allows cookie writes inside Server Actions and Route Handlers. `Secure` is enforced by the browser
against the page origin, so it holds behind the reverse proxy's TLS termination (Coolify's Traefik) and still works on
`http://localhost`, which browsers treat as a secure context. Next URL-encodes cookie values, so the
JSON is stored raw and decoded once on the client. Older cookies (a bare display name, or
`{ name, role }` from before LASCE-SEC-001) still greet; any `role` in them is ignored.

`lasce_account` is readable and editable by anyone at the browser, so it is display-only: it must
never carry or decide a role, a permission, access to Administración or the edit mode
(LASCE-SEC-001). Those come from the HttpOnly session, as described in [The header](#the-header).

## Login

1. `/acceso` decides where a successful login returns: the `next` parameter when a protected page
   set it, otherwise the same-host page the visitor came from (the Referer of the navigation),
   otherwise the home page; every value passes `safeReturnPath`. It shows the notice "Debes iniciar sesión para
   continuar." when `reason=auth`. A visitor who is already signed in is redirected to `next`.
2. The card posts to `loginUser`: input is validated (`login.ts`), the address is lower-cased and
   looked up (`findUserByEmail`), and the password is checked with `verifyPassword`. When the
   address is unknown the check runs against `UNKNOWN_USER_PASSWORD_HASH` anyway, so a wrong address
   costs the same scrypt time as a wrong password and the response time reveals nothing.
3. On success `createSession` inserts the row and sets both cookies, then the action redirects to
   `next`, outside its `try` block because `redirect()` works by throwing.
4. On failure the form gets field errors for empty or malformed input, or one generic message,
   "Correo o contraseña incorrectos.", with no field marked. Unexpected errors log only the error
   message, never the input.

`safeReturnPath` accepts a single-slash, printable-ASCII path on this site and rejects everything
else, including `//host`, schemes and `/acceso` itself (which would loop); the fallback is the home
page.
`loginRedirectPath(returnTo)` builds `/acceso?next=<encoded>&reason=auth` for protected pages.

To try any of this locally, `pnpm accounts:create` creates one account per role and prints their
shared password; see
[user-administration.md](user-administration.md#optional-local-test-accounts).

## Sessions

`auth.sessions` stores `token_hash` (SHA-256 of the cookie token, base64url), `user_id` (cascade
on delete), `expires_at` and `created_at`. The token itself is never stored, so a database read
yields nothing a browser could present.

- `getSessionUser()` is read-only and memoised per request: `null` when the cookie is missing or
  malformed (no query), when no row matches or when the row has expired; otherwise the user's id,
  name, email, institution, country code, role and creation date. It never writes cookies.
- `requireUser(returnTo)` returns that user or redirects to the login page with the way back. It is
  the guard every protected page calls first.
- Lifetime is absolute: 30 days from login, no sliding renewal. Expired rows are ignored and left
  in place; a cleanup job is a follow-up.

## Logout

Every "Cerrar sesión" control (the header, the mobile menu and the account page) asks for
confirmation first through `SignOutButton`, a native modal dialog; on the account page confirming
submits the form, and without JavaScript the button submits directly. `logoutUser` then calls
`deleteCurrentSession` (delete the row by hash, delete both cookies, even when no row is found)
and `redirect('/')`. The redirect lives in the action on purpose: an action
that only cleared cookies would make Next re-render the current route, and on `/cuenta` that
re-render would run `requireUser` and bounce the visitor who just signed out to the login notice.
The same export serves the form on `/cuenta`, which works without JavaScript, and the header's
sign-out button. Revocation is immediate; the end-to-end suite re-adds a revoked session cookie and
checks that `/cuenta` still redirects.

## The header

`useAccount` reads `lasce_account` through `useSyncExternalStore` for the display name only: the
server and the hydration pass render the signed-out links, then React re-renders with the client
value, so the greeting appears at once and the public pages stay static.

Everything privileged comes from `GET /api/session` (LASCE-SEC-001). The handler reads the
HttpOnly session with `getSessionUser()` and the current matrix with `getPermissionsForRole()`, and
answers `{ signedIn: false }` or `{ signedIn: true, name, role, canAccessAdmin, canEdit }` with
`Cache-Control: no-store`:

- `canAccessAdmin` uses `canSeeAdminNavigation(role)`, the same rule as the `administracion`
  layout, so the link is never offered to an account the panel would turn away.
- `canEdit` is true when the role holds `create_components`, `edit_components` or
  `delete_components` right now (`CONTENT_EDIT_PERMISSIONS` in `capabilities.ts`).

`useAccount` asks it whenever the account cookie changes, on every navigation (the header passes
the pathname as `refreshKey`) and when the tab becomes visible again, so a role or matrix change
shows without a new login. Anonymous visitors (no account cookie) make no request. Until the
answer arrives, and whenever it fails, `canAccessAdmin` and `canEdit` are `false`: nothing
privileged is shown on a guess. `parseSessionCapabilities` treats any malformed body as signed out,
and only a literal `true` grants a capability.

`AccountMenu` and `AccountLinks` take `canAccessAdmin` and `canEdit` as props; the `role` they also
get only labels the account. `AccountLinks` renders "Ingresar", or the account menu (desktop) and
plain links (mobile); registration is reached through the access page's own tab.

Edit mode is a presentation preference kept in `localStorage` (`lasce:cms-edit-mode`). It is turned
off when the account signs out, when the server answers `signedIn: false` (the stale account cookie
is also removed) and when the server says the account cannot edit. It never unlocks anything on its
own: every create, edit and delete control also needs the page's server-computed grant
(`userHasPermission`), and every write repeats the check in its Route Handler or Server Action.

Signing out turns edit mode off, clears the client cookie first (so the menu flips even when the
redirect lands on the current page), runs the action, and puts the name back if the action fails.

Known lag: another open tab keeps showing the signed-in menu until it navigates or becomes visible.
Its protected pages still redirect correctly, because the server checks the session row, not the
cookie.

## Protecting a page

```tsx
import { requireUser } from '@/app/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function MiPaginaPage() {
  const user = await requireUser('/mi-pagina')
  // ...
}
```

Calling `requireUser` (or `getSessionUser`) makes the route dynamic. Do it in the page or in the
layout of a protected section, never in the shared `(public)` layout, which would make every public
page dynamic and add a database lookup per view. A `proxy.ts` early gate is not needed for
correctness; the admin panel gate (#83) may add one for a faster redirect.

## What later tickets build on

- Role permissions ([role-permissions.md](role-permissions.md)): `requirePermission` sits next to
  `requireUser` and reads `auth.role_permissions` for `SessionUser.role` on each request.
- Download gating (#81): send anonymous visitors to `loginRedirectPath(<resource path>)` so login
  returns them to the resource. Signed-in access already checks `download_resources` on
  `/administracion/descargas`. `/datos` follows this pattern: the page stays public, passes
  `loginRedirectPath('/datos')` to its download buttons, and its Server Action reads
  `getSessionUser()` itself ([downloads.md](downloads.md)).
- Admin panel: the `administracion` layout calls `requireUser('/administracion')`, turns
  visitors away with Acceso denegado, and offers only the menu sections the account's grants
  unlock ([admin-navigation.md](admin-navigation.md)). Individual sections still check their own
  permissions.

## Known gaps

- No rate limiting or lockout on login; the placeholder hash only evens out the KDF time.
- No "log out everywhere", no sliding renewal, no cleanup of expired rows.
- The display-name cookie can lag in other tabs (see above); it never grants anything.
- The registration card's success link reloads the page on the login tab rather than prefilling it.
