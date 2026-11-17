import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

/**
 * LASCE-SEC-001: the readable `lasce_account` cookie must not decide any
 * privileged interface. The header asks `GET /api/session`, which reads the
 * HttpOnly session; protected pages and endpoints check their own permission.
 */

const EDIT_MODE_KEY = 'lasce:cms-edit-mode'

const headerActions = (page: Page) => page.locator('.header-actions')
const adminLink = (page: Page) =>
  headerActions(page).getByRole('link', { name: 'Administración', exact: true })
const editSwitch = (page: Page) => headerActions(page).getByRole('switch', { name: 'Modo edición' })

/** Overwrites the readable account cookie, the way a visitor could in DevTools. */
async function forgeAccountCookie(context: BrowserContext, name: string, role: string) {
  await context.addCookies([
    {
      name: 'lasce_account',
      value: encodeURIComponent(JSON.stringify({ name, role })),
      url: 'http://localhost:3000',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ])
}

/** Loads `path` and waits until the header has the server's answer. */
async function gotoAndConfirm(page: Page, path: string) {
  const answered = page.waitForResponse(
    (response) => response.url().endsWith('/api/session') && response.ok(),
  )
  await page.goto(path)
  const response = await answered
  return (await response.json()) as Record<string, unknown>
}

async function openAccountMenu(page: Page) {
  await headerActions(page).locator('.account-menu summary').press('Enter')
  await expect(headerActions(page).getByRole('link', { name: 'Mi cuenta' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
})

for (const forged of ['ADMIN', 'ASSISTANT'] as const) {
  test(`a visitor with a forged ${forged} cookie gets no privileged controls or access`, async ({
    page,
    context,
  }) => {
    const fixture = await createSignedInUser(context, 'VISITOR')
    try {
      await forgeAccountCookie(context, fixture.user.fullName, forged)
      // A persisted edit mode, as if a privileged account had used this browser before.
      await page.addInitScript((key) => window.localStorage.setItem(key, 'true'), EDIT_MODE_KEY)

      const session = await gotoAndConfirm(page, '/investigacion')
      expect(session).toMatchObject({ signedIn: true, role: 'VISITOR' })
      expect(session.canAccessAdmin).toBe(false)
      expect(session.canEdit).toBe(false)

      await openAccountMenu(page)
      await expect(adminLink(page)).toHaveCount(0)
      await expect(editSwitch(page)).toHaveCount(0)
      // No create, edit or delete control renders on a content page either.
      await expect(page.getByRole('button', { name: 'Agregar área de investigación' })).toHaveCount(
        0,
      )
      await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0)
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), EDIT_MODE_KEY))
        .toBe('false')

      // The panel turns the account away, whatever the cookie says.
      await page.goto('/administracion')
      await expect(page.getByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeVisible()
      await page.goto('/administracion/usuarios')
      await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })
}

test('direct protected requests are rejected regardless of the account cookie', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'VISITOR')
  try {
    await forgeAccountCookie(context, fixture.user.fullName, 'ADMIN')
    await page.goto('/')

    const before = await page.request.get('/api/research-areas')
    const create = await page.request.post('/api/research-areas', {
      data: {
        content: {
          es: { title: '[SEC-001] No debe existir', description: 'Prueba.' },
          en: { title: '[SEC-001] Must not exist', description: 'Test.' },
        },
        src: '/images/research/nueva.jpg',
      },
    })
    const remove = await page.request.delete(
      '/api/research-areas/00000000-0000-0000-0000-000000000000',
    )
    const health = await page.request.get('/api/health/services')
    const after = await page.request.get('/api/research-areas')

    expect(create.status()).toBe(403)
    expect(remove.status()).toBe(403)
    expect(health.status()).toBe(403)
    // Nothing was created.
    expect(await after.text()).toBe(await before.text())
  } finally {
    await fixture.cleanup()
  }
})

test('an anonymous request gets no session and no privileges, even with a forged cookie', async ({
  page,
  context,
}) => {
  await forgeAccountCookie(context, 'Nadie', 'ADMIN')

  const session = await gotoAndConfirm(page, '/')

  expect(session).toEqual({ signedIn: false })
  // The stale greeting is dropped and the header offers sign-in.
  await expect(headerActions(page).getByRole('link', { name: 'Ingresar' })).toBeVisible()
  await expect(headerActions(page).locator('.account-menu')).toHaveCount(0)
  const cookies = await context.cookies('http://localhost:3000')
  expect(cookies.find((cookie) => cookie.name === 'lasce_account')).toBeUndefined()
})

test('an authorized administrator keeps the link and the edit-mode switch', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    const session = await gotoAndConfirm(page, '/')
    expect(session).toMatchObject({ signedIn: true, canAccessAdmin: true, canEdit: true })

    await openAccountMenu(page)
    await expect(adminLink(page)).toHaveAttribute('href', '/administracion')
    await expect(editSwitch(page)).toBeVisible()
    // The readable cookie carries the name only.
    const account = (await context.cookies('http://localhost:3000')).find(
      (cookie) => cookie.name === 'lasce_account',
    )
    expect(JSON.parse(decodeURIComponent(account?.value ?? '{}'))).toEqual({
      name: fixture.user.fullName,
    })
  } finally {
    await fixture.cleanup()
  }
})

test('a server-side role change shows on the next navigation, with no new login', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ASSISTANT')
  try {
    await gotoAndConfirm(page, '/')
    await openAccountMenu(page)
    await expect(adminLink(page)).toBeVisible()

    await fixture.prisma.user.update({ where: { id: fixture.user.id }, data: { role: 'VISITOR' } })

    const session = await gotoAndConfirm(page, '/noticias')
    expect(session).toMatchObject({ role: 'VISITOR', canAccessAdmin: false, canEdit: false })
    await openAccountMenu(page)
    await expect(adminLink(page)).toHaveCount(0)
    await expect(editSwitch(page)).toHaveCount(0)
  } finally {
    await fixture.cleanup()
  }
})

test('signing out turns edit mode off and removes the privileged controls', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    await gotoAndConfirm(page, '/investigacion')
    await openAccountMenu(page)
    await editSwitch(page).click()
    await expect(editSwitch(page)).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: 'Agregar área de investigación' })).toBeVisible()

    await headerActions(page).getByRole('button', { name: 'Cerrar sesión' }).click()
    await page
      .getByRole('dialog', { name: '¿Cerrar sesión?' })
      .getByRole('button', { name: 'Cerrar sesión' })
      .click()

    await expect(headerActions(page).getByRole('link', { name: 'Ingresar' })).toBeVisible()
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), EDIT_MODE_KEY))
      .toBe('false')
    await page.goto('/investigacion')
    await expect(page.getByRole('button', { name: 'Agregar área de investigación' })).toHaveCount(0)
    await expect(adminLink(page)).toHaveCount(0)
  } finally {
    await fixture.cleanup()
  }
})
