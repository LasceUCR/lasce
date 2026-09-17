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
| Account cookie (name, role) and account copy                                 | `apps/web/app/lib/auth/account.ts`                                                                                | Vitest, colocated                       |
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
| `lasce_account` | JSON `{ name, role }`            | same, minus `HttpOnly`                                                | the header, on the client     |

Both are set by `createSession` and removed by `deleteCurrentSession`, and only there: Next only
allows cookie writes inside Server Actions and Route Handlers. `Secure` is enforced by the browser
against the page origin, so it holds behind Railway's TLS termination and still works on
`http://localhost`, which browsers treat as a secure context. Next URL-encodes cookie values, so the
JSON is stored raw and decoded once on the client. A cookie that still holds only the display name
(from a session opened before this payload existed) still greets; its role is unknown, so the
Administración tab stays hidden until the next login.

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

`useAccount` reads `lasce_account` through `useSyncExternalStore`: the server and the hydration
pass render the signed-out links, then React re-renders with the client value. The header
re-renders on every navigation, so the cookie set by a login redirect is picked up without wiring.
Signing out clears the client cookie first (so the menu flips even when the redirect lands on the
current page), runs the action, and puts the cookie back if the action fails. `AccountLinks`
renders "Ingresar", or "Hola, <nombre>" (to `/cuenta`) and "Cerrar sesión", in the desktop header
and in the mobile menu; registration is reached through the access page's own tab. The
Administración item is included only when the cookie role is `ASSISTANT` or `ADMIN`. Hiding the
tab is not an authorization check: `/administracion` can still be opened by URL.

Known lag: another open tab keeps showing the signed-in menu until it navigates. Its protected
pages still redirect correctly, because the server checks the session row, not the cookie. The
role in `lasce_account` can also lag if an administrator changes it during the session; the next
login refreshes it.

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
  `/administracion/descargas`.
- Admin panel (#83): `requireUser` plus a panel-level grant in the `administracion` layout; the
  `administracion.spec.ts` assertion that the summary never redirects still holds. Individual
  sections already check their own permissions.

## Known gaps

- No rate limiting or lockout on login; the placeholder hash only evens out the KDF time.
- No "log out everywhere", no sliding renewal, no cleanup of expired rows.
- The display-name cookie can lag in other tabs (see above).
- The registration card's success link reloads the page on the login tab rather than prefilling it.
