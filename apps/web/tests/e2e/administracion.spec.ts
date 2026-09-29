import { expect, test, type Page } from '@playwright/test'

import { DEFAULT_ROLE_PERMISSIONS } from '@/app/lib/auth/permissions'

import { createSignedInUser } from './helpers/admin-users'

function adminMenu(page: Page) {
  return page.getByRole('navigation', { name: 'Panel de administración' })
}

test('opens the administration page directly, like every other public route', async ({ page }) => {
  const response = await page.goto('/administracion')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/administracion')
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
  await expect(page.getByText('Panel de administración')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
  await expect(page.getByRole('complementary', { name: 'Información provisional' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', {
      name: 'Administración',
      exact: true,
    }),
  ).toHaveCount(0)
})

test('shows the summary stats and infrastructure status panels', async ({ page }) => {
  await page.goto('/administracion')

  await expect(page.getByText('Investigadores')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Actividad reciente' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Servicios' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Tareas y pipelines' })).toBeVisible()
})

test('hides Administración from a signed-in visitor', async ({ page, context }) => {
  const fixture = await createSignedInUser(context, 'VISITOR')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', {
        name: 'Administración',
        exact: true,
      }),
    ).toHaveCount(0)
  } finally {
    await fixture.cleanup()
  }
})

test('reaches the section from the main navigation and marks it as current', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    const navigation = page.getByRole('navigation', { name: 'Navegación principal' })
    const link = navigation.getByRole('link', { name: 'Administración', exact: true })

    await link.click()

    await expect(page).toHaveURL(/\/administracion$/)
    await expect(link).toHaveAttribute('aria-current', 'page')
  } finally {
    await fixture.cleanup()
  }
})

test('keeps the header tab current while browsing the other sidebar sections', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ASSISTANT')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/administracion')

    const sidebar = page.getByRole('navigation', { name: 'Panel de administración' })
    const headerLink = page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Administración', exact: true })

    await sidebar.getByRole('link', { name: 'Infraestructura' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Infraestructura' })).toBeVisible()
    await expect(page.getByText('Contenido en preparación')).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Infraestructura' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(headerLink).toHaveAttribute('aria-current', 'page')
  } finally {
    await fixture.cleanup()
  }
})

test('sends an anonymous visitor to login from Descargas', async ({ page }) => {
  await page.goto('/administracion/descargas')
  await expect(page).toHaveURL(/acceso\?next=%2Fadministracion%2Fdescargas&reason=auth/)
})

test('shows only the public sections to an anonymous visitor', async ({ page }) => {
  await page.goto('/administracion')

  const menu = adminMenu(page)
  await expect(menu.getByRole('link', { name: 'Resumen', exact: true })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Infraestructura', exact: true })).toBeVisible()
  for (const label of ['Descargas', 'Usuarios', 'Permisos']) {
    await expect(menu.getByRole('link', { name: label, exact: true })).toHaveCount(0)
  }
  await expect(menu.getByRole('link')).toHaveCount(2)
})

test('shows an assistant the sections its grants unlock', async ({ page, context }) => {
  const fixture = await createSignedInUser(context, 'ASSISTANT')
  try {
    await page.goto('/administracion')

    const menu = adminMenu(page)
    await expect(menu.getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0)
    await expect(menu.getByRole('link', { name: 'Permisos', exact: true })).toHaveCount(0)

    await menu.getByRole('link', { name: 'Descargas', exact: true }).click()

    await expect(page).toHaveURL(/\/administracion\/descargas$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Descargas' })).toBeVisible()
  } finally {
    await fixture.cleanup()
  }
})

test('shows an administrator every section', async ({ page, context }) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    await page.goto('/administracion')

    await expect(adminMenu(page).getByRole('link')).toHaveText([
      'Resumen',
      'Descargas',
      'Usuarios',
      'Permisos',
      'Infraestructura',
    ])
  } finally {
    await fixture.cleanup()
  }
})

test('follows the permission matrix rather than the role', async ({ page, context }) => {
  const fixture = await createSignedInUser(context, 'VISITOR')
  try {
    await page.goto('/administracion')
    const descargas = adminMenu(page).getByRole('link', { name: 'Descargas', exact: true })
    await expect(descargas).toBeVisible()

    await fixture.prisma.rolePermission.deleteMany({
      where: { role: 'VISITOR', permission: 'download_resources' },
    })
    await page.reload()

    await expect(descargas).toHaveCount(0)
    await page.goto('/administracion/descargas')
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
  } finally {
    await fixture.prisma.rolePermission.deleteMany({ where: { role: 'VISITOR' } })
    await fixture.prisma.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS.VISITOR.map((permission) => ({
        role: 'VISITOR' as const,
        permission,
      })),
    })
    await fixture.cleanup()
  }
})
