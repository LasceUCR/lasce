import { expect as baseExpect, test, type Browser, type Page } from '@playwright/test'

import es from '@/messages/es.json' with { type: 'json' }

import { createSignedInUser } from './helpers/admin-users'

/**
 * Forgot password end to end (LASCE-CON-0012-448), against a real SMTP sink: Mailpit, which the
 * CI `e2e-shard` job runs as a service and `pnpm services:up` starts locally. An administrator
 * points the portal at it on `/administracion/correo`, then the visitor asks for a link, reads
 * the email through Mailpit's HTTP API, and resets the password.
 */

// Hashing, the database, the background email and dev-server compiles all take a moment.
const expect = baseExpect.configure({ timeout: 15_000 })

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'
const SMTP_HOST = process.env.MAILPIT_SMTP_HOST ?? 'localhost'
const SMTP_PORT = process.env.MAILPIT_SMTP_PORT ?? '1025'

const copy = es.auth.passwordReset
const admin = es.administration.email
const newPassword = 'una contraseña nueva y larga'

interface MailpitSummary {
  ID: string
  To: { Address: string }[]
}

async function mailpitAvailable(): Promise<boolean> {
  try {
    return (await fetch(`${MAILPIT_URL}/api/v1/messages?limit=1`)).ok
  } catch {
    return false
  }
}

async function messagesTo(address: string): Promise<MailpitSummary[]> {
  const query = new URLSearchParams({ query: `to:"${address}"` })
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?${query}`)
  const body = (await response.json()) as { messages: MailpitSummary[] }
  return body.messages
}

/** The reset link of the newest email to `address`, as a path on this site. */
async function resetLinkFor(address: string): Promise<string> {
  let messages: MailpitSummary[] = []
  // The email goes out after the response, so it may take a moment to arrive.
  await baseExpect
    .poll(async () => (messages = await messagesTo(address)).length, { timeout: 20_000 })
    .toBeGreaterThan(0)
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0]?.ID}`)
  const { Text } = (await response.json()) as { Text: string }
  const link = /https?:\/\/[^\s]+\/restablecer-contrasena\?token=[A-Za-z0-9_-]{43}/.exec(Text)?.[0]
  baseExpect(link, 'the email carries a reset link').toBeTruthy()
  const url = new URL(link ?? '')
  return `${url.pathname}${url.search}`
}

// Typing before React has attached to the form loses the values when hydration lands.
async function waitForHydration(page: Page, selector: string) {
  await page.waitForFunction(
    (target) => {
      const element = document.querySelector(target)
      return element !== null && Object.keys(element).some((key) => key.startsWith('__reactFiber'))
    },
    selector,
    { timeout: 30_000 },
  )
}

/** An administrator saves Mailpit as the portal's SMTP server through the Correo section. */
async function configureMailpit(browser: Browser) {
  const context = await browser.newContext()
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    const page = await context.newPage()
    await page.goto('/administracion/correo')
    await expect(page.getByRole('heading', { level: 1, name: admin.title })).toBeVisible()
    await waitForHydration(page, '.email-settings-form')

    await page.getByLabel(admin.labels.host, { exact: true }).fill(SMTP_HOST)
    await page.getByLabel(admin.labels.port, { exact: true }).fill(SMTP_PORT)
    await page.getByLabel(admin.labels.security, { exact: true }).selectOption('none')
    await page.getByLabel(admin.labels.username, { exact: true }).fill('')
    await page.getByLabel(admin.labels.fromAddress, { exact: true }).fill('no-responder@lasce.test')
    await page.getByLabel(admin.labels.fromName, { exact: true }).fill('LASCE')
    await page.getByRole('button', { name: admin.save }).click()
    await expect(page.getByText(admin.saved)).toBeVisible()

    // The test email goes to the administrator's own address.
    await page.getByRole('button', { name: admin.test.send }).click()
    await expect(
      page.getByText(admin.test.sent.replace('{email}', fixture.user.email)),
    ).toBeVisible()
    await baseExpect.poll(async () => (await messagesTo(fixture.user.email)).length).toBe(1)
  } finally {
    await fixture.cleanup()
    await context.close()
  }
}

async function requestLink(page: Page, address: string) {
  await page.goto('/recuperar-contrasena')
  await waitForHydration(page, '.registration-form')
  await page.getByLabel(copy.request.labels.email, { exact: true }).fill(address)
  await page.getByRole('button', { name: copy.request.submit }).click()
  await expect(page.getByRole('heading', { name: copy.request.successTitle })).toBeVisible()
  await expect(page.getByText(copy.request.successBody)).toBeVisible()
}

test.beforeAll(async ({ browser }) => {
  if (!(await mailpitAvailable())) {
    // CI always runs Mailpit, so a missing one there is a failure, not a reason to skip.
    if (process.env.CI) throw new Error(`Mailpit is not reachable at ${MAILPIT_URL}.`)
    return
  }
  await configureMailpit(browser)
})

test.beforeEach(async () => {
  test.skip(
    !process.env.CI && !(await mailpitAvailable()),
    'Mailpit is not running (pnpm services:up starts it).',
  )
})

test('resets a forgotten password, ends old sessions and works only once', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'VISITOR')
  // The helper's address has capitals, which registration never stores; use the stored form.
  const email = fixture.user.email.toLowerCase()
  await fixture.prisma.user.update({ where: { id: fixture.user.id }, data: { email } })
  try {
    // The account is signed in somewhere: this session must not survive the reset.
    await page.goto('/cuenta')
    await expect(page).toHaveURL(/\/cuenta$/)
    const oldSession = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith('lasce_'),
    )
    await context.clearCookies()

    // "¿Olvidaste tu contraseña?" on the login card opens the recovery page.
    await page.goto('/acceso')
    await page.getByRole('link', { name: es.auth.login.forgotPassword }).click()
    await expect(page).toHaveURL(/\/recuperar-contrasena$/)

    await requestLink(page, email)
    const link = await resetLinkFor(email)

    // A password that breaks the rule, or does not match, is refused next to the field.
    await page.goto(link)
    await waitForHydration(page, '.registration-form')
    const password = page.getByLabel(copy.reset.labels.password, { exact: true })
    const confirmation = page.getByLabel(copy.reset.labels.passwordConfirmation, { exact: true })
    await password.fill(newPassword)
    await confirmation.fill('otra contraseña distinta')
    await page.getByRole('button', { name: copy.reset.submit }).click()
    await expect(confirmation).toHaveAccessibleDescription(
      copy.reset.validation.confirmationMismatch,
    )

    await confirmation.fill(newPassword)
    await page.getByRole('button', { name: copy.reset.submit }).click()
    await expect(page).toHaveURL(/\/acceso$/)
    await expect(page.getByText(es.auth.login.resetDone)).toBeVisible()

    // The session from before the reset no longer opens the account page.
    await context.addCookies(oldSession)
    await page.goto('/cuenta')
    await expect(page).toHaveURL(/\/acceso\?next=%2Fcuenta&reason=auth$/)
    await context.clearCookies()

    // The new password signs in.
    await page.goto('/acceso?next=%2Fcuenta')
    await waitForHydration(page, '.login-card form')
    const card = page.locator('.login-card')
    await card.getByLabel(es.auth.login.labels.email, { exact: true }).fill(email)
    await card.getByLabel(es.auth.login.labels.password, { exact: true }).fill(newPassword)
    await card.getByRole('button', { name: es.auth.login.submit }).click()
    await expect(page).toHaveURL(/\/cuenta$/)

    // The link worked once; now it only offers a new one.
    await context.clearCookies()
    await page.goto(link)
    await expect(page.getByRole('heading', { name: copy.reset.invalidTitle })).toBeVisible()
    await expect(page.getByRole('link', { name: copy.reset.requestNew })).toHaveAttribute(
      'href',
      '/recuperar-contrasena',
    )
    await expect(page.getByLabel(copy.reset.labels.password, { exact: true })).toHaveCount(0)
  } finally {
    await fixture.cleanup()
  }
})

test('answers an unknown address exactly like a registered one and sends nothing', async ({
  page,
}) => {
  const unknown = `nadie-${Date.now().toString(36)}@example.com`

  await requestLink(page, unknown)

  // Give the background job the time a real email takes, then check nothing went out.
  await page.waitForTimeout(3_000)
  baseExpect(await messagesTo(unknown)).toHaveLength(0)
})

test('rejects a made-up link and offers a new one', async ({ page }) => {
  await page.goto(`/restablecer-contrasena?token=${'A'.repeat(43)}`)

  await expect(page.getByRole('heading', { name: copy.reset.invalidTitle })).toBeVisible()
  await expect(page.getByText(copy.reset.invalidBody)).toBeVisible()
})
