# Registration

How a visitor creates a portal account (LASCE-SEC-008-071), what stores it, and what the next
tickets in the epic can rely on. Login and sessions are LASCE-SEC-008-072; roles and permissions
are LASCE-SEC-008-073 and the ADM tickets that follow.

## The flow

```
/registro (Server Component)
  └─ RegistrationForm (client)  ──submit──▶  registerUser (Server Action)
       useActionState                          ├─ readRegistrationInput   FormData → six strings
                                               ├─ validateRegistration    zod, Spanish messages
                                               ├─ hashPassword            scrypt
                                               └─ createUser              prisma.user.create
                                                    └─ P2002 → DuplicateEmailError → "Ya existe..."
```

| Piece                  | File                                        | Covered by                                |
| ---------------------- | ------------------------------------------- | ----------------------------------------- |
| Page                   | `apps/web/app/(public)/registro/page.tsx`   | Playwright (`tests/e2e/registro.spec.ts`) |
| Server Action          | `apps/web/app/(public)/registro/actions.ts` | Playwright                                |
| Rules, messages, state | `apps/web/app/lib/auth/registration.ts`     | Vitest, colocated                         |
| Password hashing       | `apps/web/app/lib/auth/password.ts`         | Vitest, colocated                         |
| Countries              | `apps/web/app/lib/auth/countries.ts`        | Vitest, colocated                         |
| Persistence            | `apps/web/app/lib/auth/users.ts`            | Vitest, colocated (`@lasce/db` mocked)    |
| Card and fields        | `apps/web/app/components/public/auth/*.tsx` | Vitest, colocated, stories as fixtures    |
| Table                  | `auth.users`, see `database-definition.md`  | Prisma migration, worker model test       |

The page is static. Nothing reads the database at render time; the country list is computed on
the server with `Intl.DisplayNames` and passed to the client as props, so the browser never has to
produce a Spanish country name itself.

## Fields and rules

All six fields are required, in this order, with these labels:

| Field                  | Label              | Rule                                                        |
| ---------------------- | ------------------ | ----------------------------------------------------------- |
| `fullName`             | Nombre completo    | trimmed, 1 to 120 characters                                |
| `email`                | Correo electrónico | trimmed, lower-cased, valid address, at most 254 characters |
| `institution`          | Institución        | trimmed, 1 to 160 characters                                |
| `countryCode`          | País               | one of the 249 ISO 3166-1 alpha-2 codes in `countries.ts`   |
| `password`             | Contraseña         | 8 to 128 characters, not trimmed                            |
| `passwordConfirmation` | Repetir contraseña | equal to `password`; reported only when it is not empty     |

Every rule and every message lives in `registration.ts`. The form sets `noValidate`, so the
browser never shows its own (locale-dependent) validation bubbles: what the visitor sees is always
the server's message, and it is the same with JavaScript disabled.

The Server Action returns one flat state object:

```ts
{
  status: ('idle' | 'error' | 'success', values, fieldErrors, formError)
}
```

`values` echoes the four non-secret fields so the visitor does not retype them; passwords are never
returned. `fieldErrors` carries the first message per failed field and `formError` the summary
shown in the `role="alert"` region, which receives focus after a failed submission.

## Passwords

`hashPassword` uses Node's built-in scrypt (no native dependency) with `N = 2^15, r = 8, p = 3`,
a 16-byte random salt and a 64-byte key. That is one of the OWASP-listed configurations; it costs
about 32 MiB and roughly 120 ms per hash. The stored string is self-describing:

```
scrypt$32768$8$3$<salt base64>$<hash base64>
```

`verifyPassword(password, stored)` reads the parameters back from the string and compares in
constant time. Raising the cost later only changes the constant; existing rows keep verifying with
the parameters they were hashed with. A different algorithm needs a new prefix and nothing else.

## Email uniqueness

The unique index is on the raw `email` column. The application trims and lower-cases the address
in the schema before it reaches the database, which is what makes the constraint case-insensitive.
**Anything that looks a user up by email must lower-case its input first**; login (#72) included.

A duplicate is detected from the database's unique violation (Prisma code `P2002`), never from a
prior `SELECT`, so two simultaneous registrations cannot both succeed. The visitor sees
"Ya existe una cuenta con este correo electrónico." on the email field. This discloses that an
address is registered, which the acceptance criteria require; rate limiting is a follow-up.

## Roles

`auth.users.role` is the Postgres enum `auth.user_role` with `visitor`, `assistant` and `admin`.
Self-registration always produces `visitor`: the form has no role field, the Server Action forwards
only the five validated fields, and `createUser` picks those fields one by one rather than
spreading its argument, so a `role` smuggled into the request is dropped before the insert and the
database default applies. Granting `assistant` or `admin` is an administrator's action (#80); what
each role may do is #73.

## Entry points

- The public header shows "Crear cuenta" next to "Ingresar" on desktop and hides both under
  760px; the mobile menu lists "Crear cuenta" after the navigation items.
- `/registro` is in `publicPaths` (`apps/web/app/lib/site.ts`), so it is in the sitemap and in the
  routes the accessibility spec scans.
- "Ingresar" still points at `/login`, which does not exist until #72.

## What #72 builds on

- `verifyPassword` from `password.ts`, against `auth.users.password_hash`.
- Lower-casing the submitted email before `findUnique`.
- `RegistrationForm` accepts an optional `heading` and `registration-layout` is already a grid, so
  the two-card access page from the mockup (login left, registration right) needs no restyling.
- Sessions belong in a new table in the `auth` schema, not in columns on `users`.

## Known gaps

- No rate limiting or bot protection on the Server Action.
- No email verification; the address is stored as given.
- The header overflows between 1121px and about 1320px, a pre-existing issue the extra link makes
  slightly more visible.
