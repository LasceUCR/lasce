# Password reset

How a registered user who forgot their password gets a new one (LASCE-CON-0012-448, issue #448),
and how administrators configure the SMTP server that sends the reset email. Signing in and
sessions are in [sessions.md](sessions.md); registration and the password rule in
[registration.md](registration.md).

## The flow

```
/acceso (login card) ── "¿Olvidaste tu contraseña?" ──▶ /recuperar-contrasena
  PasswordRecoveryForm ──submit──▶ requestPasswordReset (Server Action)
                                     ├─ validateRecovery          email only, lower-cased
                                     ├─ answer "Revisa tu correo" at once, for every valid address
                                     └─ after(): processPasswordResetRequest
                                          ├─ consumeRateLimits       Redis, per IP and per account
                                          ├─ issuePasswordResetToken nothing for an unknown address
                                          └─ sendMail                SMTP settings from the database

email link ──▶ /restablecer-contrasena?token=…
  page: isPasswordResetTokenUsable ── no ──▶ "El enlace no es válido" + "Solicitar un enlace nuevo"
  PasswordResetForm ──submit──▶ resetPassword (Server Action)
                                  ├─ validateReset            shared new-password rule
                                  ├─ hashPassword             scrypt
                                  ├─ resetPasswordWithToken   one transaction, see below
                                  └─ redirect /acceso?restablecida=1 ──▶ success toast
```

| Piece                                  | File                                                                                               | Covered by                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Request page and action                | `apps/web/app/(public)/recuperar-contrasena/{page,actions}.ts(x)`                                  | Playwright (`tests/e2e/password-reset.spec.ts`) |
| Reset page and action                  | `apps/web/app/(public)/restablecer-contrasena/{page,actions}.ts(x)`                                | Playwright, Vitest (`actions.test.ts`)          |
| Routes, fields, schemas, states        | `apps/web/app/lib/auth/password-reset.ts`                                                          | Vitest, colocated                               |
| Shared new-password rule               | `apps/web/app/lib/auth/password-rules.ts`                                                          | Vitest, colocated                               |
| Tokens, hashing, expiry, the link      | `apps/web/app/lib/auth/password-reset-token.ts`                                                    | Vitest, colocated, no mocks                     |
| Token store and the reset transaction  | `apps/web/app/lib/auth/password-reset-store.ts`                                                    | Vitest, `@lasce/db` mocked                      |
| Rate limits, email body, orchestration | `apps/web/app/lib/auth/password-reset-request.ts`, `apps/web/app/lib/rate-limit.ts`                | Vitest, colocated                               |
| Cards and the toast after the redirect | `apps/web/app/components/public/auth/{PasswordRecoveryForm,PasswordResetForm}`, `toast/FlashToast` | Vitest, stories as fixtures                     |
| Mailer, SMTP settings, encryption      | `apps/web/app/services/mail/{mailer,smtpSettings,crypto}.ts`                                       | Vitest, `tests/unit/services/mail/`             |
| Correo section and its route handlers  | `components/administracion/EmailSettingsForm.tsx`, `app/api/email-settings/`                       | Vitest, Playwright                              |
| Tables                                 | `auth.password_reset_tokens`, `public.smtp_settings` (`database-definition.md`)                    | Prisma migration, worker model test             |

## Not disclosing who has an account

- The request page answers every **valid** address with the same confirmation, registered or not.
  Only a malformed address gets a field error, which says nothing about accounts.
- The answer is sent before anything that depends on the account runs. The rate limits, the token
  and the email happen in Next's `after()`, so the response time is the same for a registered
  address, an unknown one, a rate-limited one and one whose email fails.
- An unknown address writes nothing: no token row, no email.
- Failures (SMTP not configured, a password that no longer decrypts, a refused message, Redis down)
  are logged on the server without the address or the token. The visitor still sees the same
  confirmation.

## Tokens

- 32 random bytes from `crypto.randomBytes`, base64url, the same shape as session tokens.
- Only the base64url SHA-256 is stored, in `auth.password_reset_tokens.token_hash`, so a database
  read yields no working link.
- Valid for **30 minutes** (`RESET_TOKEN_TTL_MINUTES`) and only while `used_at` is null.
- Asking again deletes the account's earlier tokens, used or not, so only the newest link works
  and an account never holds more than one row.
- Opening the link checks the token without using it. Only a successful submission uses it.
- The link is built on `NEXT_PUBLIC_APP_URL` (`siteUrl`), never on the request's Host header, which
  a caller could forge to receive a working token on another domain.
- `/restablecer-contrasena` sends `Referrer-Policy: no-referrer` (`next.config.ts`, and the page's
  metadata) and is `noindex`, so the token never leaves in a Referer.

`resetPasswordWithToken` runs in one transaction:

1. `UPDATE ... SET used_at = now() WHERE token_hash = ? AND used_at IS NULL AND expires_at > now()`.
   This compare-and-set is what makes the token single use, even for two simultaneous submissions.
2. Store the new scrypt hash in `auth.users.password_hash`.
3. Delete every row of the account in `auth.sessions`: every browser that was signed in, including
   an attacker's, has to sign in again. Delete the account's reset tokens too; a reuse of the link
   then finds no row, which is just as invalid.
4. Record `user.password_reset` in the audit trail (no hash, no token).

The visitor is not signed in afterwards. The action clears this browser's cookies and redirects to
`/acceso?restablecida=1`, where `FlashToast` shows "Contraseña actualizada correctamente…" and
removes the parameter from the address bar. An expired, used or unknown token shows "El enlace no
es válido" with a link to request a new one, on the page and on submit alike. The action looks
the token up before hashing the password, so a made-up token costs no scrypt work.

## The password rule

`password-rules.ts` holds the rule (8 to 128 characters, not trimmed, at least one uppercase
letter, one lowercase letter, one number and one special character, confirmation must match) and
both registration and the reset form build their schemas from it. The character classes and the
`PasswordRequirements` checklist shown under the new-password field are described in
[registration.md](registration.md#password-requirements). A weak password is refused before the
token is looked up, so the link keeps working and nothing changes. Messages appear next to each
field; an unexpected failure is a toast and the form keeps what was typed.

## Rate limits

Fixed windows in Redis (`app/lib/rate-limit.ts`), counted by an atomic Lua script that sets the
TTL on the first hit:

| Window      | Limit      | Key                                               |
| ----------- | ---------- | ------------------------------------------------- |
| Per IP      | 5 / 15 min | `lasce:rate:password-reset:ip:<ip>`               |
| Per account | 3 / 60 min | `lasce:rate:password-reset:email:<sha256(email)>` |

The address is keyed by its hash, never in clear. The IP is `X-Real-IP` (set by Traefik in the
deployed environments to the peer it accepted), else the last `X-Forwarded-For` entry, the one the
nearest proxy appended; the client-supplied first entries are never trusted. Without either header
only the per-account window applies. A limited request gets the same confirmation and sends nothing. If Redis fails or
does not answer within 2 seconds the request is allowed and the failure logged: an outage of the
limiter must not become an outage of password recovery.

## SMTP settings (`/administracion/correo`)

There are **no `SMTP_*` environment variables**. An administrator enters the server in the Correo
section of the panel, gated by the grant `manage_email_settings` (administrators only by default;
see [role-permissions.md](role-permissions.md)). Until then, reset requests send nothing and the
page says so.

| Field                         | Notes                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| Servidor SMTP, Puerto         | Host name or IP, port 1 to 65535                                |
| Seguridad                     | `tls` (implicit, usually 465), `starttls` (usually 587), `none` |
| Usuario, Contraseña           | Optional. An empty user means no authentication                 |
| Correo / Nombre del remitente | The `From` of every message                                     |

- The password never reaches the browser. The page only says whether one is stored; leaving the
  field empty keeps it, but only while the server, port, security mode and username stay the same
  and the stored password still decrypts. Changing any of those asks for the password again, so a
  saved credential is never replayed to a new host or over a downgraded connection. Removing the
  username drops the stored password.
- "Enviar correo de prueba" sends a message to the signed-in administrator's own address with the
  **saved** settings and reports the outcome in a toast.
- Every change records `smtp_settings.update` in the audit trail with the names of the fields that
  changed (`password` included when it changed), never their values.
- The route handlers (`PUT /api/email-settings`, `POST /api/email-settings/test`) check the grant
  themselves with `requireApiPermission`.

### How the password is stored

`public.smtp_settings.password_ciphertext` holds AES-256-GCM output, `v1.<iv>.<tag>.<ciphertext>`
(base64url parts, a random 96-bit IV per write, the version bound as additional authenticated
data). The key is derived from **`CRON_SECRET`** with HKDF-SHA256 and the fixed context label
`lasce/smtp-settings/v1` (`app/services/mail/crypto.ts`); there is no separate key variable.

Consequences:

- **Rotating `CRON_SECRET` makes the stored SMTP password unreadable.** The mailer then treats SMTP
  as not configured (and logs why), and the Correo page asks the administrator to type the password
  again. Re-entering it fixes it; nothing else is lost.
- If the server has no usable `CRON_SECRET`, no password can be saved and the page says so.

## Locally and in CI

`pnpm services:up` starts [Mailpit](https://mailpit.axllent.org/), an SMTP sink: SMTP on
`localhost:1025`, the inbox at <http://localhost:8025>. Save host `localhost`, port `1025`,
security "Sin cifrado", no username on `/administracion/correo`, then request a link and read it in
Mailpit. The `e2e-shard` job in `ci.yml` runs Mailpit as a service; `password-reset.spec.ts`
configures it through the panel and reads the email through Mailpit's API. Locally the spec skips
itself when Mailpit is not running.

## Known gaps

- Login itself still has no rate limit or lockout ([sessions.md](sessions.md#known-gaps)).
- An account that asks for a link and never comes back keeps one expired row until it asks again
  or is deleted; a scheduled purge is a follow-up. Used tokens are deleted by the reset itself.
- The per-account window can be used up by someone who knows the address (3 requests in an hour),
  which delays that account's own reset by up to an hour. It is the price of limiting mail to one
  inbox; the page cannot say so without disclosing that the account exists.
- The email is sent from the web process (in `after()`), not through the worker queue. A web
  restart in the second between the answer and the send loses that one email; asking again works.
