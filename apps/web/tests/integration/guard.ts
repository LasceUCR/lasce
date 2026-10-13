/**
 * Decides whether the database integration tests may run against a database. They write to it
 * (and create a temporary trigger), so they only ever run against a disposable database chosen
 * explicitly for them:
 *
 * - `INTEGRATION_DATABASE_URL` must be set. `DATABASE_URL` is never used as a fallback.
 * - The database name must end in `_test`.
 * - The host must be local, unless `INTEGRATION_DATABASE_ALLOWED_HOST` names it exactly (for a
 *   CI service container, for example).
 * - It must not be the same database as `DATABASE_URL`, the development database.
 *
 * Messages name the host and the database but never the user or the password.
 */

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]']

export type IntegrationDatabase = { ok: true; url: string } | { ok: false; reason: string }

function locate(url: URL) {
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  }
}

/**
 * Connection parameters that node-postgres takes from the query string over the URL's host and
 * port (`?host=db.example.com` connects there whatever the URL's host says), so the checks below
 * would not be checking the server actually used.
 */
const CONNECTION_OVERRIDES = ['host', 'hostaddr', 'port']

function parse(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'postgres:' || url.protocol === 'postgresql:' ? url : null
  } catch {
    return null
  }
}

export function checkIntegrationDatabase(
  env: Record<string, string | undefined>,
): IntegrationDatabase {
  const value = env.INTEGRATION_DATABASE_URL
  if (!value) {
    return {
      ok: false,
      reason:
        'INTEGRATION_DATABASE_URL is not set. Point it at a disposable database whose name ends in _test.',
    }
  }

  const url = parse(value)
  if (!url) return { ok: false, reason: 'INTEGRATION_DATABASE_URL is not a postgresql:// URL.' }

  const override = CONNECTION_OVERRIDES.find((name) => url.searchParams.has(name))
  if (override) {
    return {
      ok: false,
      reason: `INTEGRATION_DATABASE_URL sets "${override}" in its query string, which would override the host or port it names. Put the host and port in the URL itself.`,
    }
  }

  const target = locate(url)

  if (!target.database.endsWith('_test')) {
    return {
      ok: false,
      reason: `the database "${target.database}" does not end in _test, so it is not treated as disposable.`,
    }
  }

  const allowedHosts = [...LOCAL_HOSTS, env.INTEGRATION_DATABASE_ALLOWED_HOST].filter(Boolean)
  if (!allowedHosts.includes(target.host)) {
    return {
      ok: false,
      reason: `the host "${target.host}" is not local. Set INTEGRATION_DATABASE_ALLOWED_HOST to it only if it is a disposable test server.`,
    }
  }

  const development = env.DATABASE_URL ? parse(env.DATABASE_URL) : null
  if (development) {
    const other = locate(development)
    if (
      other.host === target.host &&
      other.port === target.port &&
      other.database === target.database
    ) {
      return {
        ok: false,
        reason: 'INTEGRATION_DATABASE_URL points at the same database as DATABASE_URL.',
      }
    }
  }

  return { ok: true, url: value }
}
