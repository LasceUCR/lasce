import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { DEFAULT_ROLE_PERMISSIONS } from '@/app/lib/auth/permissions'

import { createSignedInUser } from './helpers/admin-users'

// LASCE-SEC-008: /administracion/permisos in Spanish and in English. Every test that can write
// puts the visitor and assistant grants back to their defaults afterwards, the state the other
// specs expect. Wide enough for the desktop header, where the language menu lives.
test.use({ viewport: { width: 1600, height: 900 } })

const PERMISOS = '/administracion/permisos'

async function prismaClient() {
  const { prisma } = await import('@lasce/db')
  return prisma
}

/** Every stored grant, as `ROLE:permission`, to check that nothing was written. */
async function storedGrants() {
  const prisma = await prismaClient()
  const rows = await prisma.rolePermission.findMany({ select: { role: true, permission: true } })
  return rows.map((row) => `${row.role}:${row.permission}`).sort()
}

async function restoreDefaultGrants() {
  const prisma = await prismaClient()
  for (const role of ['VISITOR', 'ASSISTANT'] as const) {
    await prisma.rolePermission.deleteMany({ where: { role } })
    await prisma.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS[role].map((permission) => ({ role, permission })),
    })
  }
}

async function useEnglish(context: BrowserContext) {
  await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
}

const languageMenuLabel = { Español: 'Idioma: Español', English: 'Language: English' } as const

async function switchLanguage(page: Page, from: 'Español' | 'English', to: 'Español' | 'English') {
  await page.getByRole('banner').getByLabel(languageMenuLabel[from]).click()
  await page.getByRole('banner').getByRole('button', { name: to }).click()
}

function form(page: Page) {
  return page.locator('form').filter({ has: page.getByRole('table') })
}

test.beforeEach(async () => {
  await restoreDefaultGrants()
})

test.afterEach(async () => {
  await restoreDefaultGrants()
})

test('shows the page in Spanish when no language is chosen', async ({ page, context }) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  try {
    await page.goto(PERMISOS)

    await expect(page).toHaveTitle('Permisos | Administración | LASCE')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('heading', { level: 1, name: 'Permisos' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Permisos por rol' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Permiso', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^Persona administradora/ })).toContainText(
      'No se puede cambiar',
    )
    await expect(page.getByText('Ver y cambiar los permisos asociados a cada rol.')).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: 'Editar componentes: Asistente' }),
    ).toBeChecked()
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    await expect(form(page)).not.toContainText(/administration\.|access\./)
  } finally {
    await admin.cleanup()
  }
})

test('shows the page in English, accessible names and descriptions included', async ({
  page,
  context,
}) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  await useEnglish(context)
  try {
    await page.goto(PERMISOS)

    await expect(page).toHaveTitle('Permissions | Administration | LASCE')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: 'Permissions' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Permissions by role' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Permissions by role table' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Permission', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^Administrator/ })).toContainText(
      'Cannot be changed',
    )
    await expect(page.getByText('Download data from the GOES satellites.')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Edit components: Assistant' })).toBeChecked()
    await expect(
      page.getByRole('checkbox', {
        name: 'Configure permissions: Administrator (cannot be changed)',
      }),
    ).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Discard' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await expect(form(page)).not.toContainText(/administration\.|access\./)
    await expect(form(page)).not.toContainText(
      /Permiso|Visitante|Asistente|Persona administradora|Guardar|Descartar|casilla/,
    )
  } finally {
    await admin.cleanup()
  }
})

test('changes language on the same route without saving anything', async ({ page, context }) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  try {
    await page.goto(PERMISOS)
    const before = await storedGrants()

    // A pending change in the table is not saved by changing the language either.
    await page.getByRole('checkbox', { name: 'Editar componentes: Visitante' }).check()
    await expect(page.getByText('1 cambio sin guardar')).toBeVisible()

    await switchLanguage(page, 'Español', 'English')

    await expect(page.getByRole('heading', { level: 1, name: 'Permissions' })).toBeVisible()
    await expect(page).toHaveURL(/\/administracion\/permisos$/)
    expect(await storedGrants()).toEqual(before)

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Permissions' })).toBeVisible()

    await switchLanguage(page, 'English', 'Español')
    await expect(page.getByRole('heading', { level: 1, name: 'Permisos' })).toBeVisible()
    expect(await storedGrants()).toEqual(before)
  } finally {
    await admin.cleanup()
  }
})

test('counts pending changes and confirms them in English, and cancelling saves nothing', async ({
  page,
  context,
}) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  await useEnglish(context)
  try {
    await page.goto(PERMISOS)
    const before = await storedGrants()

    await page.getByRole('checkbox', { name: 'Edit components: Visitor' }).check()
    await expect(page.getByText('1 unsaved change', { exact: true })).toBeVisible()
    await page.getByRole('checkbox', { name: 'Download resources: Assistant' }).uncheck()
    await expect(page.getByText('2 unsaved changes', { exact: true })).toBeVisible()
    await expect(page.getByRole('row', { name: /Edit components, unsaved/ })).toBeVisible()

    await page.getByRole('button', { name: 'Save changes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Confirm permission change' })
    await expect(dialog).toContainText(
      'Do you want to save the permissions of Visitor and Assistant?',
    )
    await expect(dialog.getByRole('button', { name: 'No, cancel' })).toBeFocused()

    await dialog.getByRole('button', { name: 'No, cancel' }).click()

    await expect(dialog).toBeHidden()
    expect(await storedGrants()).toEqual(before)
    await expect(page.getByRole('checkbox', { name: 'Edit components: Visitor' })).toBeChecked()
  } finally {
    await admin.cleanup()
  }
})

test('saves in English and confirms it with an English toast', async ({ page, context }) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  await useEnglish(context)
  try {
    await page.goto(PERMISOS)

    await page.getByRole('checkbox', { name: 'Download resources: Assistant' }).uncheck()
    await page.getByRole('button', { name: 'Save changes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Confirm permission change' })
    await dialog.getByRole('button', { name: 'Yes, save permissions' }).click()

    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await expect(page.getByText('Permissions updated for Assistant.')).toBeVisible()
    expect(await storedGrants()).not.toContain('ASSISTANT:download_resources')
    // Stored by identifier, never by the label shown.
    expect(await storedGrants()).toContain('ASSISTANT:edit_components')
  } finally {
    await admin.cleanup()
  }
})

test('explains a failed save with an English toast and keeps the dialog and the draft', async ({
  page,
  context,
}) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  await useEnglish(context)
  try {
    await page.goto(PERMISOS)
    await page.getByRole('checkbox', { name: 'Edit components: Visitor' }).check()

    // Someone else changes the visitor grants meanwhile.
    await admin.prisma.rolePermission.create({
      data: { role: 'VISITOR', permission: 'download_goes_resources' },
    })

    await page.getByRole('button', { name: 'Save changes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Confirm permission change' })
    await dialog.getByRole('button', { name: 'Yes, save permissions' }).click()

    await expect(
      dialog.getByText("This role's information changed. Reload the page before saving it again."),
    ).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Reload page' })).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(await storedGrants()).not.toContain('VISITOR:edit_components')

    await dialog.getByRole('button', { name: 'No, cancel' }).click()
    await expect(page.getByRole('checkbox', { name: 'Edit components: Visitor' })).toBeChecked()
  } finally {
    await admin.cleanup()
  }
})

test('denies the page to an account without access, in English', async ({ page, context }) => {
  const assistant = await createSignedInUser(context, 'ASSISTANT')
  await useEnglish(context)
  try {
    await page.goto(PERMISOS)

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
    await expect(
      page.getByText('You are not authorized to configure role permissions.'),
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  } finally {
    await assistant.cleanup()
  }
})

test('names every control in English for keyboard users and assistive technology', async ({
  page,
  context,
}) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  await useEnglish(context)
  try {
    await page.goto(PERMISOS)

    const checkbox = page.getByRole('checkbox', { name: 'Create components: Visitor' })
    await checkbox.focus()
    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()
    await expect(page.getByRole('status').filter({ hasText: '1 unsaved change' })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])

    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog', { name: 'Confirm permission change' })).toBeVisible()
    const dialogResults = await new AxeBuilder({ page })
      .include('dialog[open]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(dialogResults.violations).toEqual([])
  } finally {
    await admin.cleanup()
  }
})

test('keeps the translated page readable from phones to desktops', async ({ page, context }) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  try {
    for (const locale of ['es', 'en'] as const) {
      await context.addCookies([
        { name: 'lasce_locale', value: locale, url: 'http://localhost:3000' },
      ])
      await page.goto(PERMISOS)
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow, `${locale} at ${width}px`).toBe(false)
        await expect(
          page.getByRole('button', { name: /^(Guardar cambios|Save changes)$/ }),
        ).toBeVisible()
      }
    }
  } finally {
    await admin.cleanup()
  }
})
