import AxeBuilder from '@axe-core/playwright'
import { expect as baseExpect, test, type Page } from '@playwright/test'

import { accountMenuCopy, cuentaIntro, signOutDialogCopy } from '@/app/lib/auth/account'
import {
  ACCESS_PATH,
  LOGIN_CARD_ID,
  LOGIN_LABELS,
  REGISTRATION_CARD_ID,
  REGISTRATION_HREF,
  accesoIntro,
  accessTabsCopy,
  loginCardHeading,
  loginFormCopy,
  loginMessages,
  registrationCardHeading,
  type LoginFieldName,
} from '@/app/lib/auth/login'
import {
  REGISTRATION_LABELS,
  registrationFormCopy,
  type RegistrationFieldName,
} from '@/app/lib/auth/registration'

// The local database persists between runs and CI starts from an empty one, so
// the account registered below gets an address no earlier run could have used.
// Submissions here hash a password, hit the database and then navigate to a
// route the dev server may still have to compile, so assertions get three
// times the default window. Real failures still surface, just later.
const expect = baseExpect.configure({ timeout: 15_000 })

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const account = {
  fullName: 'Ana Pérez Rojas',
  email: `login-${runId}@example.com`,
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
  password: 'una contraseña larga',
}

// Every locator is scoped: "Crear cuenta", "Iniciar sesión", "Cerrar sesión",
// role="alert" and role="status" all occur more than once on these pages.
const loginCard = (page: Page) => page.locator('.login-card')
const loginField = (page: Page, name: LoginFieldName) =>
  loginCard(page).getByLabel(LOGIN_LABELS[name], { exact: true })
const loginButton = (page: Page) =>
  loginCard(page).getByRole('button', { name: loginFormCopy.submit })
const loginAlert = (page: Page) => loginCard(page).getByRole('alert')
const headerActions = (page: Page) => page.locator('.header-actions')
const signOutButton = (page: Page) =>
  headerActions(page).getByRole('button', { name: accountMenuCopy.signOut })
const signOutDialog = (page: Page) => page.getByRole('dialog', { name: signOutDialogCopy.title })

// Every sign-out control asks first; this answers yes.
async function confirmSignOut(page: Page) {
  await signOutDialog(page).getByRole('button', { name: signOutDialogCopy.confirm }).click()
}

// Typing before React has attached to the form loses the values when hydration
// lands, which happens late on a busy dev server. React marks hydrated nodes
// with a `__reactFiber` key, so wait for it on the form before interacting.
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

async function openAccess(page: Page, path = ACCESS_PATH) {
  await page.goto(path)
  await waitForHydration(page, '.login-card form')
}

const LOGIN_REDIRECT = /\/acceso\?next=%2Fcuenta&reason=auth$/

// Reaches the access page the way a visitor does, through the header link,
// so the navigation carries the page they came from.
async function signInFromHeader(page: Page, originPath: string) {
  await page.goto(originPath)
  await headerActions(page).getByRole('link', { name: accountMenuCopy.signIn }).click()
  await waitForHydration(page, '.login-card form')
  await loginField(page, 'email').fill(account.email)
  await loginField(page, 'password').fill(account.password)
  await loginButton(page).click()
  await page.waitForURL((url) => url.pathname !== ACCESS_PATH)
}

// Signs in with a direct visit to the access page and waits for the landing
// page, so the session cookie is in place before the next step.
async function signIn(page: Page, path = ACCESS_PATH, email = account.email) {
  await openAccess(page, path)
  await loginField(page, 'email').fill(email)
  await loginField(page, 'password').fill(account.password)
  await loginButton(page).click()
  await page.waitForURL((url) => url.pathname !== ACCESS_PATH)
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  const card = page.locator(`#${REGISTRATION_CARD_ID}`)
  const field = (name: RegistrationFieldName) =>
    card.getByLabel(REGISTRATION_LABELS[name], { exact: true })

  await page.goto(REGISTRATION_HREF)
  await waitForHydration(page, `#${REGISTRATION_CARD_ID} form`)
  await field('fullName').fill(account.fullName)
  await field('email').fill(account.email)
  await field('institution').fill(account.institution)
  await field('countryCode').selectOption(account.countryCode)
  await field('password').fill(account.password)
  await field('passwordConfirmation').fill(account.password)
  await card.getByRole('button', { name: registrationFormCopy.submit }).click()
  await expect(page.getByRole('status')).toContainText(registrationFormCopy.successTitle)
  await page.close()
})

test('opens on the login tab and switches to registration without leaving the page', async ({
  page,
}) => {
  await openAccess(page)

  await expect(page.getByRole('heading', { level: 1, name: accesoIntro.title })).toBeVisible()
  await expect(page.getByText(accesoIntro.lead)).toBeVisible()
  const loginTab = page.getByRole('tab', { name: accessTabsCopy.tabs.login })
  const registerTab = page.getByRole('tab', { name: accessTabsCopy.tabs.register })
  await expect(loginTab).toHaveAttribute('aria-selected', 'true')
  await expect(
    loginCard(page).getByRole('heading', { level: 2, name: loginCardHeading.title }),
  ).toBeVisible()
  await expect(loginButton(page)).toBeVisible()
  await expect(page.locator(`#${REGISTRATION_CARD_ID}`)).toBeHidden()

  await registerTab.click()
  await expect(registerTab).toHaveAttribute('aria-selected', 'true')
  await expect(
    page.getByRole('heading', { level: 2, name: registrationCardHeading.title }),
  ).toBeVisible()
  await expect(loginCard(page)).toBeHidden()
  await expect(page).toHaveURL(/\?tab=crear-cuenta$/)

  await registerTab.press('ArrowLeft')
  await expect(loginTab).toBeFocused()
  await expect(loginCard(page)).toBeVisible()
  await expect(page.locator(`#${LOGIN_CARD_ID}`)).toBeVisible()

  // The decorative background sits behind everything and stays out of the tree.
  await expect(page.locator('.space-page-bg img')).toBeVisible()
  await expect(page.locator('.space-page-bg')).toHaveAttribute('aria-hidden', 'true')
  await expect(
    loginCard(page).getByRole('link', { name: loginFormCopy.noAccountLink }),
  ).toHaveAttribute('href', REGISTRATION_HREF)
  await expect(
    headerActions(page).getByRole('link', { name: accountMenuCopy.signIn }),
  ).toHaveAttribute('href', ACCESS_PATH)

  // The card's own link must open the registration tab, not only rewrite the address bar.
  await loginCard(page).getByRole('link', { name: loginFormCopy.noAccountLink }).click()
  await expect(page).toHaveURL(/\?tab=crear-cuenta$/)
  await expect(registerTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator(`#${REGISTRATION_CARD_ID}`)).toBeVisible()
  await expect(loginCard(page)).toBeHidden()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.mobile-menu summary').click()
  const menu = page.getByRole('navigation', { name: 'Navegación móvil' })
  const names = await menu.getByRole('link').allTextContents()
  expect(names.slice(-1)).toEqual([accountMenuCopy.signIn])
  await expect(menu.getByRole('link', { name: 'Crear cuenta' })).toHaveCount(0)
  await expect(menu.getByRole('link', { name: accountMenuCopy.signIn })).toHaveAttribute(
    'href',
    ACCESS_PATH,
  )
})

test('rejects a wrong password and an unknown address with the same message', async ({ page }) => {
  await openAccess(page)
  await loginField(page, 'email').fill(account.email)
  await loginField(page, 'password').fill('otra contraseña')
  await loginButton(page).click()

  await expect(loginAlert(page)).toHaveText(loginMessages.invalidCredentials)
  await expect(page).toHaveURL(/\/acceso$/)
  await expect(loginField(page, 'email')).not.toHaveAttribute('aria-invalid', 'true')
  await expect(loginField(page, 'email')).toHaveValue(account.email)
  await expect(loginField(page, 'password')).toHaveValue('')

  await loginField(page, 'email').fill(`nadie-${runId}@example.com`)
  await loginField(page, 'password').fill(account.password)
  await loginButton(page).click()

  await expect(loginAlert(page)).toHaveText(loginMessages.invalidCredentials)
})

test('names both missing fields and passes the accessibility scan in that state', async ({
  page,
}) => {
  await openAccess(page)

  await loginButton(page).click()

  await expect(loginAlert(page)).toHaveText(loginMessages.reviewFields)
  await expect(loginAlert(page)).toBeFocused()
  await expect(loginField(page, 'email')).toHaveAttribute('aria-invalid', 'true')
  await expect(loginField(page, 'password')).toHaveAttribute('aria-invalid', 'true')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('signs in and returns to the page the visitor came from', async ({ page }) => {
  await signInFromHeader(page, '/noticias')

  await expect(page).toHaveURL(/\/noticias$/)
  await expect(signOutButton(page)).toBeVisible()
})

test('lands on the home page when nothing says where the visitor came from', async ({ page }) => {
  await signIn(page)

  await expect(page).toHaveURL(/\/$/)
  await expect(signOutButton(page)).toBeVisible()
})

test('shows the profile on the account page once signed in', async ({ page }) => {
  await signIn(page)
  await page.goto('/cuenta')

  await expect(page).toHaveURL(/\/cuenta$/)
  await expect(page.getByRole('heading', { level: 1, name: cuentaIntro.title })).toBeVisible()
  const main = page.getByRole('main')
  await expect(main.getByText(account.fullName)).toBeVisible()
  await expect(main.getByText(account.email)).toBeVisible()
  await expect(main.getByText('Visitante')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i)
  await expect(page.locator('.space-page-bg img')).toBeVisible()

  await expect(
    headerActions(page).getByRole('link', { name: accountMenuCopy.greeting(account.fullName) }),
  ).toHaveAttribute('href', '/cuenta')
  await expect(signOutButton(page)).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.mobile-menu summary').click()
  const menu = page.getByRole('navigation', { name: 'Navegación móvil' })
  await expect(menu.getByRole('link', { name: accountMenuCopy.account })).toHaveAttribute(
    'href',
    '/cuenta',
  )
  await expect(menu.getByRole('button', { name: accountMenuCopy.signOut })).toBeVisible()
})

test('returns to a safe path after login and ignores an off-site one', async ({ page }) => {
  await signIn(page, `${ACCESS_PATH}?next=%2Fdatos`)
  await expect(page).toHaveURL(/\/datos$/)

  await signOutButton(page).click()
  await confirmSignOut(page)
  await expect(page).toHaveURL(/\/$/)

  await signIn(page, `${ACCESS_PATH}?next=https%3A%2F%2Fevil.example`)
  await expect(page).toHaveURL(/\/$/)
})

test('explains why a protected page sent the visitor to log in, then takes them back', async ({
  page,
}) => {
  await page.goto('/cuenta')

  await expect(page).toHaveURL(LOGIN_REDIRECT)
  await expect(loginCard(page).getByRole('status')).toHaveText(loginMessages.authRequired)

  await loginField(page, 'email').fill(account.email)
  await loginField(page, 'password').fill(account.password)
  await loginButton(page).click()

  await expect(page).toHaveURL(/\/cuenta$/)
})

test('signs out from the header and loses access to the account page', async ({ page }) => {
  await signInFromHeader(page, '/noticias')
  await expect(page).toHaveURL(/\/noticias$/)

  await signOutButton(page).click()
  await confirmSignOut(page)

  await expect(page).toHaveURL(/\/$/)
  await expect(
    headerActions(page).getByRole('link', { name: accountMenuCopy.signIn }),
  ).toBeVisible()
  await expect(signOutButton(page)).toHaveCount(0)

  await page.goto('/cuenta')
  await expect(page).toHaveURL(LOGIN_REDIRECT)
})

test('asks before signing out and keeps the session when cancelled', async ({ page }) => {
  await signIn(page)
  await expect(signOutButton(page)).toBeVisible()

  await signOutButton(page).click()
  await expect(signOutDialog(page)).toBeVisible()
  await expect(signOutDialog(page).getByText(signOutDialogCopy.body)).toBeVisible()

  await signOutDialog(page).getByRole('button', { name: signOutDialogCopy.cancel }).click()
  await expect(signOutDialog(page)).toHaveCount(0)
  await expect(signOutButton(page)).toBeVisible()

  await signOutButton(page).click()
  await page.keyboard.press('Escape')
  await expect(signOutDialog(page)).toHaveCount(0)
  await page.goto('/cuenta')
  await expect(page).toHaveURL(/\/cuenta$/)
})

test('a revoked session cookie no longer opens the account page', async ({ page, context }) => {
  await signIn(page)
  await page.goto('/cuenta')
  await expect(page).toHaveURL(/\/cuenta$/)
  const session = (await context.cookies()).find((cookie) => cookie.name === 'lasce_session')
  expect(session).toBeDefined()

  // The form on the page itself, which works without JavaScript.
  await page.getByRole('main').getByRole('button', { name: accountMenuCopy.signOut }).click()
  await confirmSignOut(page)
  await expect(page).toHaveURL(/\/$/)

  await context.addCookies([session!])
  await page.goto('/cuenta')

  await expect(page).toHaveURL(LOGIN_REDIRECT)
})

test('sends a signed-in visitor away from the login page', async ({ page }) => {
  await signIn(page)
  await expect(page).toHaveURL(/\/$/)

  // A plain navigation with nowhere to return to lands on the home page, and
  // one that says where it came from returns there.
  await page.goto(ACCESS_PATH)
  await expect(page).toHaveURL(/\/$/)

  await page.goto(`${ACCESS_PATH}?next=%2Fdatos`)
  await expect(page).toHaveURL(/\/datos$/)
})

test('the old sign-in and sign-up routes redirect to the access page, query included', async ({
  page,
}) => {
  await page.goto('/login?next=%2Fcuenta&reason=auth')
  await expect(page).toHaveURL(LOGIN_REDIRECT)
  await expect(loginCard(page).getByRole('status')).toHaveText(loginMessages.authRequired)

  await page.goto('/registro')
  await expect(page).toHaveURL(/\/acceso\?tab=crear-cuenta$/)
  await expect(
    page.getByRole('heading', { level: 2, name: registrationCardHeading.title }),
  ).toBeVisible()
  await expect(loginCard(page)).toBeHidden()
})
