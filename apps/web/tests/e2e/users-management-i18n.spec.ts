import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { createAdminFixture, createSignedInUser } from './helpers/admin-users'

// LASCE-ADM-001-379: /administracion/usuarios in Spanish and in English. Wide enough for the
// desktop header, where the language menu lives.
test.use({ viewport: { width: 1600, height: 900 } })

const USUARIOS = '/administracion/usuarios'

async function useEnglish(context: BrowserContext) {
  await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
}

const languageMenuLabel = { Español: 'Idioma: Español', English: 'Language: English' } as const

async function switchLanguage(page: Page, from: 'Español' | 'English', to: 'Español' | 'English') {
  await page.getByRole('banner').getByLabel(languageMenuLabel[from]).click()
  await page.getByRole('banner').getByRole('button', { name: to }).click()
}

function panel(page: Page) {
  return page.locator('section').filter({ has: page.getByRole('table') })
}

test('shows the page in Spanish when no language is chosen', async ({ page, context }) => {
  const fixture = await createAdminFixture(context)
  try {
    await page.goto(USUARIOS)

    await expect(page).toHaveTitle('Usuarios | Administración | LASCE')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Usuarios y roles' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Correo electrónico' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Persona administradora' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Buscar usuarios' })).toBeVisible()
    await expect(panel(page)).not.toContainText(/administration\.|access\./)
  } finally {
    await fixture.cleanup()
  }
})

test('shows the page in English, accessible names included', async ({ page, context }) => {
  const fixture = await createAdminFixture(context)
  await useEnglish(context)
  try {
    await page.goto(USUARIOS)

    await expect(page).toHaveTitle('Users | Administration | LASCE')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Users and roles' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Users and roles table' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Email address' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Administrator' })).toBeVisible()
    await expect(
      page.getByRole('checkbox', {
        name: `Visitor: ${fixture.target.fullName} (${fixture.target.email})`,
      }),
    ).toBeChecked()

    await expect(panel(page)).not.toContainText(/administration\.|access\./)
    await expect(panel(page)).not.toContainText(
      /Visitante|Asistente|Persona administradora|Buscar|Correo electrónico|Cuenta/,
    )
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
  } finally {
    await fixture.cleanup()
  }
})

test('announces the search results with the plural rules of each language', async ({
  page,
  context,
}) => {
  const fixture = await createAdminFixture(context)
  try {
    await page.goto(USUARIOS)
    await page.getByRole('searchbox', { name: 'Buscar usuarios' }).fill(fixture.target.email)
    await expect(
      page.getByRole('status').filter({ hasText: '1 usuario encontrado.' }),
    ).toBeVisible()

    await switchLanguage(page, 'Español', 'English')

    await expect(page.getByRole('searchbox', { name: 'Search users' })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search users' }).fill('no-such-person-zzz')
    await expect(
      page.getByRole('status').filter({ hasText: 'No users found for “no-such-person-zzz”.' }),
    ).toBeVisible()
  } finally {
    await fixture.cleanup()
  }
})

test('changes language on the same route without saving any role', async ({ page, context }) => {
  const fixture = await createAdminFixture(context)
  try {
    await page.goto(USUARIOS)
    const before = await fixture.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, role: true },
    })

    await switchLanguage(page, 'Español', 'English')

    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible()
    await expect(page).toHaveURL(/\/administracion\/usuarios$/)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible()

    await switchLanguage(page, 'English', 'Español')
    await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible()

    expect(
      await fixture.prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, role: true },
      }),
    ).toEqual(before)
  } finally {
    await fixture.cleanup()
  }
})

test('stores the same role identifier whichever language assigns it', async ({ page, context }) => {
  const fixture = await createAdminFixture(context)
  try {
    await page.goto(USUARIOS)
    const row = page.getByRole('row', { name: new RegExp(fixture.target.email) })
    await page.getByRole('searchbox', { name: 'Buscar usuarios' }).fill(fixture.target.email)

    await row.getByRole('checkbox', { name: /^Asistente:/ }).click()
    await page.getByRole('button', { name: 'Sí, cambiar rol' }).click()
    await expect(page.getByText(`Rol actualizado para ${fixture.target.fullName}`)).toBeVisible()
    const inSpanish = (
      await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.target.id } })
    ).role

    await switchLanguage(page, 'Español', 'English')
    await page.getByRole('searchbox', { name: 'Search users' }).fill(fixture.target.email)
    await row.getByRole('checkbox', { name: /^Visitor:/ }).click()
    await page.getByRole('button', { name: 'Yes, change role' }).click()
    await expect(page.getByText(`Role updated for ${fixture.target.fullName}`)).toBeVisible()
    const inEnglish = (
      await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.target.id } })
    ).role

    expect([inSpanish, inEnglish]).toEqual(['ASSISTANT', 'VISITOR'])
  } finally {
    await fixture.cleanup()
  }
})

test('translates the confirmation dialog, the self-removal warning and the failure toast', async ({
  page,
  context,
}) => {
  const fixture = await createAdminFixture(context)
  await useEnglish(context)
  try {
    await page.goto(USUARIOS)
    await page.getByRole('searchbox', { name: 'Search users' }).fill(fixture.admin.email)
    const adminRow = page.getByRole('row', { name: new RegExp(fixture.admin.email) })
    await adminRow.getByRole('checkbox', { name: /^Administrator:/ }).click()

    const removal = page.getByRole('dialog', { name: 'Confirm role removal' })
    await expect(removal).toContainText('You are changing your own role.')
    await expect(removal.getByRole('button', { name: 'No, cancel' })).toBeFocused()
    await removal.getByRole('button', { name: 'No, cancel' }).click()

    await page.getByRole('searchbox', { name: 'Search users' }).fill(fixture.target.email)
    const row = page.getByRole('row', { name: new RegExp(fixture.target.email) })
    await row.getByRole('checkbox', { name: /^Assistant:/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Confirm role change' })
    await expect(dialog).toContainText('The new role will replace the current one.')
    // Another administrator changes the user first, so the save is rejected as a conflict.
    await fixture.prisma.user.update({ where: { id: fixture.target.id }, data: { role: 'ADMIN' } })
    await dialog.getByRole('button', { name: 'Yes, change role' }).click()

    await expect(dialog.getByText(/This user's information changed/)).toBeVisible()
    await expect(dialog.getByText(/La información de este usuario cambió/)).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Reload page' })).toBeVisible()
  } finally {
    await fixture.cleanup()
  }
})

test('shows the access-denied message in English to an assistant', async ({ page, context }) => {
  const assistant = await createSignedInUser(context, 'ASSISTANT')
  await useEnglish(context)
  try {
    await page.goto(USUARIOS)

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
    await expect(page.getByText('You are not authorized to manage users.')).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  } finally {
    await assistant.cleanup()
  }
})
