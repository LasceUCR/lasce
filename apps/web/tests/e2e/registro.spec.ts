import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  ACCESS_PATH,
  LOGIN_CARD_ID,
  REGISTRATION_CARD_ID,
  REGISTRATION_HREF,
  accesoIntro,
  accessTabsCopy,
} from '@/app/lib/auth/login'
import {
  REGISTRATION_FIELDS,
  REGISTRATION_LABELS,
  registrationFormCopy,
  registrationMessages,
  registroIntro,
  type RegistrationFieldName,
} from '@/app/lib/auth/registration'

// The local database persists between runs and CI starts from an empty one, so
// every account created here gets an address no earlier run could have used.
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const uniqueEmail = (tag: string) => `registro-${tag}-${runId}@example.com`

const validValues = {
  fullName: 'Ana Pérez Rojas',
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
  password: 'una contraseña larga',
  passwordConfirmation: 'una contraseña larga',
}

const requiredMessages: Record<RegistrationFieldName, string> = {
  fullName: registrationMessages.fullNameRequired,
  email: registrationMessages.emailRequired,
  institution: registrationMessages.institutionRequired,
  countryCode: registrationMessages.countryRequired,
  password: registrationMessages.passwordRequired,
  passwordConfirmation: registrationMessages.confirmationRequired,
}

// The login card on the same page shares two labels, so every field lookup
// starts from the registration card.
const registrationCard = (page: Page) => page.locator(`#${REGISTRATION_CARD_ID}`)

const field = (page: Page, name: RegistrationFieldName) =>
  registrationCard(page).getByLabel(REGISTRATION_LABELS[name], { exact: true })

const submitButton = (page: Page) =>
  registrationCard(page).getByRole('button', { name: registrationFormCopy.submit })

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Scoped to the card: Next's route announcer is also a `role="alert"` element.
const formAlert = (page: Page) => registrationCard(page).getByRole('alert')

// The registration tab's own URL, as the page leaves it after a submission.
const registrationUrl = () => new RegExp(`${escapeRegExp(REGISTRATION_HREF)}$`)

// Accessible descriptions concatenate the hint and the error, so match on the
// message rather than the whole string.
const describedBy = (message: string) => new RegExp(escapeRegExp(message))

async function fillRegistration(page: Page, values: Record<RegistrationFieldName, string>) {
  await field(page, 'fullName').fill(values.fullName)
  await field(page, 'email').fill(values.email)
  await field(page, 'institution').fill(values.institution)
  await field(page, 'countryCode').selectOption(values.countryCode)
  await field(page, 'password').fill(values.password)
  await field(page, 'passwordConfirmation').fill(values.passwordConfirmation)
}

test('the header links to the registration page on desktop and the mobile menu offers it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const registerLink = page.getByRole('link', { name: 'Crear cuenta' })
  await expect(registerLink).toHaveAttribute('href', REGISTRATION_HREF)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', ACCESS_PATH)

  await registerLink.click()
  await expect(page).toHaveURL(registrationUrl())
  await expect(page.getByRole('tab', { name: accessTabsCopy.tabs.register })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator(`#${LOGIN_CARD_ID}`)).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: accesoIntro.title })).toBeVisible()
  await expect(
    registrationCard(page).getByRole('heading', { level: 2, name: registroIntro.title }),
  ).toBeVisible()
  await expect(registrationCard(page).getByText(registroIntro.lead)).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.header-actions')).toBeHidden()
  await page.locator('.mobile-menu summary').click()
  await expect(
    page
      .getByRole('navigation', { name: 'Navegación móvil' })
      .getByRole('link', { name: 'Crear cuenta' }),
  ).toHaveAttribute('href', REGISTRATION_HREF)
})

test('shows the six fields in the agreed order and states that all are required', async ({
  page,
}) => {
  await page.goto(REGISTRATION_HREF)

  const labels = await registrationCard(page).locator('label').allTextContents()
  expect(labels).toEqual(REGISTRATION_FIELDS.map((name) => REGISTRATION_LABELS[name]))
  await expect(page.getByText(registrationFormCopy.requiredNote)).toBeVisible()
  await expect(
    field(page, 'countryCode').getByRole('option', { name: 'Costa Rica' }),
  ).toHaveAttribute('value', 'CR')
})

test('creates an account with valid data', async ({ page }) => {
  await page.goto(REGISTRATION_HREF)

  await fillRegistration(page, { ...validValues, email: uniqueEmail('valid') })
  await submitButton(page).click()

  const status = page.getByRole('status')
  await expect(
    status.getByRole('heading', { level: 2, name: registrationFormCopy.successTitle }),
  ).toBeVisible()
  await expect(
    status.getByRole('link', { name: registrationFormCopy.successLink }),
  ).toHaveAttribute('href', registrationFormCopy.successHref)
  await expect(page).toHaveURL(registrationUrl())
  await expect(submitButton(page)).toHaveCount(0)
})

test('refuses an empty submission and names every missing field', async ({ page }) => {
  await page.goto(REGISTRATION_HREF)

  await submitButton(page).click()

  const alert = formAlert(page)
  await expect(alert).toHaveText(registrationMessages.reviewFields)
  await expect(alert).toBeFocused()
  for (const name of REGISTRATION_FIELDS) {
    await expect(field(page, name)).toHaveAttribute('aria-invalid', 'true')
    await expect(field(page, name)).toHaveAccessibleDescription(describedBy(requiredMessages[name]))
    await expect(page.getByText(requiredMessages[name], { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(registrationUrl())

  // The error state is the one axe never sees on a clean load.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('rejects invalid formats and keeps the values that were fine', async ({ page }) => {
  await page.goto(REGISTRATION_HREF)

  await fillRegistration(page, {
    ...validValues,
    email: 'no-es-un-correo',
    password: '1234567',
    passwordConfirmation: 'otra cosa',
  })
  await submitButton(page).click()

  await expect(formAlert(page)).toHaveText(registrationMessages.reviewFields)
  await expect(field(page, 'email')).toHaveAccessibleDescription(
    describedBy(registrationMessages.emailInvalid),
  )
  await expect(field(page, 'password')).toHaveAccessibleDescription(
    describedBy(registrationMessages.passwordTooShort),
  )
  await expect(field(page, 'passwordConfirmation')).toHaveAccessibleDescription(
    describedBy(registrationMessages.confirmationMismatch),
  )
  await expect(field(page, 'fullName')).not.toHaveAttribute('aria-invalid', 'true')
  await expect(field(page, 'fullName')).toHaveValue(validValues.fullName)
  await expect(field(page, 'institution')).toHaveValue(validValues.institution)
  await expect(field(page, 'countryCode')).toHaveValue('CR')
  await expect(field(page, 'email')).toHaveValue('no-es-un-correo')
  await expect(field(page, 'password')).toHaveValue('')
  await expect(field(page, 'passwordConfirmation')).toHaveValue('')
})

test('does not create a second account for an email that is already registered', async ({
  page,
}) => {
  const email = uniqueEmail('dup')

  await page.goto(REGISTRATION_HREF)
  await fillRegistration(page, { ...validValues, email })
  await submitButton(page).click()
  await expect(page.getByRole('status')).toBeVisible()

  // Same address in a different case: the application lower-cases before the
  // unique index sees it, so this must collide.
  await page.goto(REGISTRATION_HREF)
  await fillRegistration(page, { ...validValues, email: email.toUpperCase() })
  await submitButton(page).click()

  await expect(field(page, 'email')).toHaveAttribute('aria-invalid', 'true')
  await expect(field(page, 'email')).toHaveAccessibleDescription(
    describedBy(registrationMessages.emailTaken),
  )
  await expect(formAlert(page)).toHaveText(registrationMessages.reviewFields)
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('ignores a role smuggled into the request', async ({ page }) => {
  await page.goto(REGISTRATION_HREF)

  await fillRegistration(page, { ...validValues, email: uniqueEmail('role') })
  await registrationCard(page)
    .locator('form')
    .evaluate((form) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'role'
      input.value = 'admin'
      form.append(input)
    })
  await submitButton(page).click()

  // The action only forwards the validated fields, so the extra entry is
  // dropped rather than rejected; `createUser`'s unit test pins that no role
  // is ever sent, and the database default assigns `visitor`.
  await expect(
    page.getByRole('status').getByRole('heading', { name: registrationFormCopy.successTitle }),
  ).toBeVisible()
})
