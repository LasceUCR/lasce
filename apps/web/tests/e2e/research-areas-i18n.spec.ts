import { randomUUID } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'
import { enableEditMode } from './helpers/edit-mode'

// Wide enough for the desktop header, where the language menu lives above 1400px.
test.use({ viewport: { width: 1600, height: 900 } })

/**
 * Two research areas of its own per test, deleted afterwards, so the seed is never touched: one
 * with both languages and one legacy area (no translation row).
 */
async function createFixtures() {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().slice(0, 8)

  const bilingual = await prisma.researchArea.create({
    data: {
      title: `Área bilingüe ${id}`,
      description: `Descripción en español del área ${id}.`,
      src: '/images/research/geomagnetismo-costa-rica.jpg',
      translations: {
        create: {
          locale: 'en',
          title: `Bilingual area ${id}`,
          description: `English description of area ${id}.`,
        },
      },
    },
  })

  const legacy = await prisma.researchArea.create({
    data: {
      title: `Área heredada ${id}`,
      description: `Guardada antes de que existieran los idiomas ${id}.`,
      src: '/images/research/geomagnetismo-costa-rica.jpg',
    },
  })

  return {
    id,
    bilingual,
    legacy,
    cleanup: () =>
      prisma.researchArea.deleteMany({ where: { id: { in: [bilingual.id, legacy.id] } } }),
  }
}

/** The header's language menu is labelled in the current language: "Idioma" or "Language". */
const languageMenuLabel = { Español: 'Idioma: Español', English: 'Language: English' } as const

async function switchLanguage(page: Page, from: 'Español' | 'English', to: 'Español' | 'English') {
  await page.getByRole('banner').getByLabel(languageMenuLabel[from]).click()
  await page.getByRole('banner').getByRole('button', { name: to }).click()
}

test('shows each research area in the language chosen in the header, and remembers it', async ({
  page,
}) => {
  const fixtures = await createFixtures()
  try {
    await page.goto('/investigacion')

    const spanishTitle = page.getByRole('heading', { name: fixtures.bilingual.title })
    await expect(spanishTitle).toHaveAttribute('lang', 'es')
    // A legacy area is shown as stored, without claiming any language.
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveAttribute(
      'lang',
      '',
    )

    await switchLanguage(page, 'Español', 'English')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: 'Research areas' })).toBeVisible()
    const englishTitle = page.getByRole('heading', { name: `Bilingual area ${fixtures.id}` })
    await expect(englishTitle).toHaveAttribute('lang', 'en')
    await expect(page.getByText(`English description of area ${fixtures.id}.`)).toBeVisible()
    // No translation: the base text stays, and nothing shows a raw key.
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toBeVisible()
    await expect(page).toHaveURL(/\/investigacion$/)

    await page.reload()
    await expect(englishTitle).toBeVisible()

    await switchLanguage(page, 'English', 'Español')
    await expect(spanishTitle).toBeVisible()
  } finally {
    await fixtures.cleanup()
  }
})

test('opens an area in English from its card and reads it in that language', async ({
  context,
  page,
}) => {
  const fixtures = await createFixtures()
  try {
    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
    await page.goto('/investigacion')

    await page
      .getByRole('link', { name: `Learn more about this area (Bilingual area ${fixtures.id})` })
      .click()

    await expect(page).toHaveURL(new RegExp(`/investigacion/areas/${fixtures.bilingual.id}$`))
    const heading = page.getByRole('heading', { level: 1, name: `Bilingual area ${fixtures.id}` })
    await expect(heading).toHaveAttribute('lang', 'en')
    await expect(page.getByText('Research area', { exact: true })).toBeVisible()
    await expect(page).toHaveTitle(`Bilingual area ${fixtures.id} | Research | LASCE`)
    await expect(page.getByRole('link', { name: 'Back to research areas' })).toBeVisible()
  } finally {
    await fixtures.cleanup()
  }
})

test('meets WCAG A and AA automated checks in English', async ({ context, page }) => {
  const fixtures = await createFixtures()
  const axe = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  try {
    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])

    await page.goto('/investigacion')
    await expect(page.getByRole('heading', { level: 1, name: 'Research areas' })).toBeVisible()
    expect((await axe().analyze()).violations).toEqual([])

    await page.goto(`/investigacion/areas/${fixtures.legacy.id}`)
    await expect(page.getByRole('heading', { level: 1, name: fixtures.legacy.title })).toBeVisible()
    expect((await axe().analyze()).violations).toEqual([])
  } finally {
    await fixtures.cleanup()
  }
})

async function openEditMode(page: Page) {
  await page.goto('/administracion')
  await enableEditMode(page)
  await page.goto('/investigacion')
}

function field(page: Page, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.getByRole('dialog').getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

test('edits an area in one language after confirming the other is still correct', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.bilingual.title}` }).click()

    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.bilingual.title}"` })
    await field(page, 'Descripción (Español)').fill(`Descripción revisada ${fixtures.id}.`)
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    // Changed in Spanish only: the English description must change too or be confirmed.
    await expect(dialog.getByRole('tab', { name: /^English · 1 por revisar$/ })).toBeVisible()
    await dialog
      .getByRole('switch', { name: 'La descripción en inglés sigue siendo correcta' })
      .click()
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Área de investigación actualizada correctamente.')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(`Descripción revisada ${fixtures.id}.`)).toBeVisible()

    await switchLanguage(page, 'Español', 'English')
    await expect(page.getByText(`English description of area ${fixtures.id}.`)).toBeVisible()
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('completes the English of an area saved before languages existed', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.legacy.title}` }).click()

    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.legacy.title}"` })
    await expect(dialog.getByRole('tab', { name: 'English · Sin traducción' })).toBeVisible()
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await field(page, 'Título (English)').fill(`Completed area ${fixtures.id}`)
    await field(page, 'Descripción (English)').fill('Now written in English.')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    // The base text now counts as Spanish: it has to be reviewed once.
    await dialog.getByRole('tab', { name: /^Español/ }).click()
    for (const name of [
      'El título en español sigue siendo correcto',
      'La descripción en español sigue siendo correcta',
    ]) {
      await dialog.getByRole('switch', { name }).click()
    }
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Área de investigación actualizada correctamente.')).toBeVisible()
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveAttribute(
      'lang',
      'es',
    )
    await switchLanguage(page, 'Español', 'English')
    await expect(
      page.getByRole('heading', { name: `Completed area ${fixtures.id}` }),
    ).toHaveAttribute('lang', 'en')
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

// The photo upload goes to MinIO, which the e2e job does not run, so the area is created through
// the API with a photo already in the repository. `ResearchAreaForm`'s unit tests cover the upload.
test('creates an area in both languages', async ({ page, context }) => {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().slice(0, 8)
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    const response = await page.request.post('/api/research-areas', {
      data: {
        content: {
          es: { title: `Área nueva ${id}`, description: 'Descripción de la nueva área.' },
          en: { title: `New area ${id}`, description: 'Description of the new area.' },
        },
        src: '/images/research/geomagnetismo-costa-rica.jpg',
      },
    })
    expect(response.status()).toBe(201)

    await page.goto('/investigacion')
    await expect(page.getByRole('heading', { name: `Área nueva ${id}` })).toBeVisible()
    await switchLanguage(page, 'Español', 'English')
    await expect(page.getByRole('heading', { name: `New area ${id}` })).toBeVisible()

    const stored = await prisma.researchArea.findFirstOrThrow({
      where: { title: `Área nueva ${id}` },
      include: { translations: true },
    })
    expect(stored.translations).toMatchObject([{ locale: 'en', title: `New area ${id}` }])
  } finally {
    await prisma.researchArea.deleteMany({ where: { title: { contains: id } } })
    await account.cleanup()
  }
})

test('deletes an area after confirming', async ({ page, context }) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Eliminar ${fixtures.legacy.title}` }).click()
    await page
      .getByRole('dialog', { name: 'Eliminar área de investigación' })
      .getByRole('button', { name: 'Eliminar' })
      .click()

    await expect(page.getByText('Área de investigación eliminada correctamente.')).toBeVisible()
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveCount(0)
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('meets WCAG A and AA automated checks in the editor, in English', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  const axe = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  try {
    await openEditMode(page)
    await switchLanguage(page, 'Español', 'English')
    await page.getByRole('button', { name: `Edit ${fixtures.legacy.title}` }).click()
    const dialog = page.getByRole('dialog', { name: `Edit "${fixtures.legacy.title}"` })
    await expect(dialog.getByText(/may not be in Spanish/)).toBeVisible()
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])

    // With errors on screen.
    await field(page, 'Title (Español)').fill('')
    await dialog.getByRole('button', { name: 'Confirm' }).click()
    await expect(dialog.getByText('The Spanish title is required.')).toBeVisible()
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('shows a long description in full with "Leer más", leaving short ones as they are', async ({
  page,
}) => {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().slice(0, 8)
  const longDescription = `${'Diseña y desarrolla plataformas informáticas para capturar y consultar datos solares. '.repeat(8)}Fin ${id}.`
  const long = await prisma.researchArea.create({
    data: {
      title: `Área extensa ${id}`,
      description: longDescription,
      src: '/images/research/geomagnetismo-costa-rica.jpg',
    },
  })
  const short = await prisma.researchArea.create({
    data: {
      title: `Área breve ${id}`,
      description: 'Una línea.',
      src: '/images/research/geomagnetismo-costa-rica.jpg',
    },
  })
  try {
    await page.goto('/investigacion')

    const longCard = page.getByRole('article', { name: `Área extensa ${id}` })
    const description = longCard.getByText(longDescription)
    const clampedHeight = (await description.boundingBox())?.height ?? 0
    const toggle = longCard.getByRole('button', { name: 'Leer más' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await toggle.click()
    await expect(longCard.getByRole('button', { name: 'Leer menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect((await description.boundingBox())?.height ?? 0).toBeGreaterThan(clampedHeight + 10)

    await expect(
      page
        .getByRole('article', { name: `Área breve ${id}` })
        .getByRole('button', { name: 'Leer más' }),
    ).toHaveCount(0)
  } finally {
    await prisma.researchArea.deleteMany({ where: { id: { in: [long.id, short.id] } } })
  }
})
