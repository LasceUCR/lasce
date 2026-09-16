import { expect, test } from '@playwright/test'

import { DEFAULT_ROLE_PERMISSIONS } from '@/app/lib/auth/permissions'

import { createSignedInUser } from './helpers/admin-users'

test('requires authentication before showing role permission management', async ({ page }) => {
  await page.goto('/administracion/permisos')
  await expect(page).toHaveURL(/acceso\?next=%2Fadministracion%2Fpermisos&reason=auth/)
  await expect(page.getByRole('checkbox')).toHaveCount(0)
})

test('denies permission management to a visitor and does not persist a write', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'VISITOR')
  try {
    await page.goto('/administracion/permisos')
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(
      page.getByText('No tienes autorización para configurar los permisos de los roles.'),
    ).toBeVisible()
  } finally {
    await fixture.cleanup()
  }
})

test('shows the current matrix and applies a saved change to access control', async ({
  page,
  context,
  browser,
}) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  const assistantContext = await browser.newContext()
  const assistant = await createSignedInUser(assistantContext, 'ASSISTANT')
  const assistantPage = await assistantContext.newPage()
  try {
    await page.goto('/administracion/permisos')
    await expect(page.getByRole('heading', { level: 1, name: 'Permisos' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Persona administradora' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Crear componentes/ })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Eliminar componentes/ })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Descargar recursos/ })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Configurar permisos/ })).toBeDisabled()

    await assistantPage.goto('/administracion/descargas')
    await expect(assistantPage.getByRole('heading', { level: 1, name: 'Descargas' })).toBeVisible()
    await assistantPage.goto('/administracion/usuarios')
    await expect(assistantPage.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()

    await page.getByRole('radio', { name: 'Asistente' }).click()
    await expect(page.getByRole('checkbox', { name: /Descargar recursos/ })).toBeChecked()
    await page.getByRole('checkbox', { name: /Descargar recursos/ }).uncheck()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status')).toContainText('Permisos actualizados para Asistente.')

    await assistantPage.goto('/administracion/descargas')
    await expect(assistantPage.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
    await expect(assistantPage.getByRole('checkbox')).toHaveCount(0)
  } finally {
    await admin.prisma.rolePermission.deleteMany({ where: { role: 'ASSISTANT' } })
    await admin.prisma.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS.ASSISTANT.map((permission) => ({
        role: 'ASSISTANT' as const,
        permission,
      })),
    })
    await assistant.cleanup()
    await assistantContext.close()
    await admin.cleanup()
  }
})

test('lets a visitor reach downloads and denies user administration', async ({ page, context }) => {
  const fixture = await createSignedInUser(context, 'VISITOR')
  try {
    await page.goto('/administracion/descargas')
    await expect(page.getByRole('heading', { level: 1, name: 'Descargas' })).toBeVisible()
    await page.goto('/administracion/usuarios')
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
  } finally {
    await fixture.cleanup()
  }
})
