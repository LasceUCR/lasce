import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1600, height: 900 } })

const languageMenuLabel = { Español: 'Idioma: Español', English: 'Language: English' } as const

async function switchLanguage(page: Page, from: 'Español' | 'English', to: 'Español' | 'English') {
  await page.getByRole('banner').getByLabel(languageMenuLabel[from]).click()
  await page.getByRole('banner').getByRole('button', { name: to }).click()
}

test('shows the gallery listing in Spanish and English', async ({ page }) => {
  await page.goto('/galeria')

  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { level: 1, name: 'Galería' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Fotos del ROSAC' })).toBeVisible()
  await expect(
    page.getByText(
      'Documentación fotográfica del desarrollo, montaje y adecuación del Radio Observatorio de Santa Cruz (ROSAC).',
    ),
  ).toBeVisible()

  await switchLanguage(page, 'Español', 'English')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'ROSAC Photos' })).toBeVisible()
  await expect(
    page.getByText(
      'Photographic documentation of the development, assembly, and set up of the Radio Observatorio de Santa Cruz (ROSAC).',
    ),
  ).toBeVisible()
  await expect(page).toHaveTitle('Gallery | LASCE')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 2, name: 'ROSAC Photos' })).toBeVisible()

  await switchLanguage(page, 'English', 'Español')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { level: 2, name: 'Fotos del ROSAC' })).toBeVisible()
})

for (const { locale, albumTitle, pageTitle } of [
  { locale: 'es', albumTitle: 'Fotos del ROSAC', pageTitle: 'Fotos del ROSAC | Galería LASCE' },
  { locale: 'en', albumTitle: 'ROSAC Photos', pageTitle: 'ROSAC Photos | Gallery LASCE' },
] as const) {
  test(`shows the ROSAC album in ${locale === 'es' ? 'Spanish' : 'English'}`, async ({
    context,
    page,
  }) => {
    if (locale === 'en') {
      await context.addCookies([
        { name: 'lasce_locale', value: locale, url: 'http://localhost:3000' },
      ])
    }

    await page.goto('/galeria/rosac')

    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1, name: albumTitle })).toBeVisible()
    await expect(page).toHaveTitle(pageTitle)
  })
}

test('switches language on the ROSAC album without leaving the album page', async ({ page }) => {
  await page.goto('/galeria/rosac')
  await expect(page.getByRole('heading', { level: 1, name: 'Fotos del ROSAC' })).toBeVisible()
  await expect(
    page.getByText(
      'Documentación fotográfica del desarrollo, montaje y adecuación del Radio Observatorio de Santa Cruz (ROSAC).',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Fotografías y video de este álbum' }),
  ).toBeVisible()

  await switchLanguage(page, 'Español', 'English')

  await expect(page).toHaveURL(/\/galeria\/rosac$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1, name: 'ROSAC Photos' })).toBeVisible()
  await expect(
    page.getByText(
      'Photographic documentation of the development, assembly, and set up of the Radio Observatorio de Santa Cruz (ROSAC).',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Photographs and video of this album' }),
  ).toBeVisible()
  await expect(page).toHaveTitle('ROSAC Photos | Gallery LASCE')
  await expect(
    page.getByRole('button', { name: 'View full size: Nighttime Work on the Radio Telescope' }),
  ).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1, name: 'ROSAC Photos' })).toBeVisible()

  await page
    .getByRole('button', { name: 'View full size: Nighttime Work on the Radio Telescope' })
    .click()
  const englishLightbox = page.getByRole('dialog', {
    name: 'Nighttime Work on the Radio Telescope',
  })
  await expect(englishLightbox).toBeVisible()
  await expect(
    englishLightbox.getByText(
      'Night view of the observatory antennas, with a lift platform being used for technical work on the main antenna.',
    ),
  ).toBeVisible()
  await expect(englishLightbox.getByRole('button', { name: 'Previous' })).toBeVisible()
  await expect(englishLightbox.getByRole('button', { name: 'Next' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(englishLightbox).toBeHidden()

  await switchLanguage(page, 'English', 'Español')

  await expect(page).toHaveURL(/\/galeria\/rosac$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { level: 1, name: 'Fotos del ROSAC' })).toBeVisible()

  await page
    .getByRole('button', {
      name: 'Ver a tamaño completo: Trabajos nocturnos en el radiotelescopio',
    })
    .click()
  const spanishLightbox = page.getByRole('dialog', {
    name: 'Trabajos nocturnos en el radiotelescopio',
  })
  await expect(spanishLightbox).toBeVisible()
  await expect(
    spanishLightbox.getByText(
      'Vista nocturna de las antenas del observatorio con una plataforma elevadora realizando labores técnicas en la antena principal.',
    ),
  ).toBeVisible()
  await expect(spanishLightbox.getByRole('button', { name: 'Anterior' })).toBeVisible()
  await expect(spanishLightbox.getByRole('button', { name: 'Siguiente' })).toBeVisible()
})

test('switches language on a ROSAC sub-album and translates its media and navigation', async ({
  page,
}) => {
  await page.goto('/galeria/rosac/previos-montaje')

  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Trabajos previos al montaje' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Preparación del sitio, cimentación y adecuación logística de los componentes del observatorio.',
    ),
  ).toBeVisible()
  await expect(page).toHaveTitle('Trabajos previos al montaje | Galería LASCE')
  await expect(
    page.getByRole('button', {
      name: 'Ver a tamaño completo: Almacenamiento de base y mecanismo azimutal',
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Volver a Fotos del ROSAC' })).toHaveAttribute(
    'href',
    '/galeria/rosac',
  )

  await switchLanguage(page, 'Español', 'English')

  await expect(page).toHaveURL(/\/galeria\/rosac\/previos-montaje$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Preparatory Work Before Assembly' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Site preparation, foundation work, and logistical arrangements for the observatory components.',
    ),
  ).toBeVisible()
  await expect(page).toHaveTitle('Preparatory Work Before Assembly | Gallery LASCE')
  await expect(
    page.getByRole('button', { name: 'View full size: Storage of the Base and Azimuth Mechanism' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to ROSAC Photos' })).toHaveAttribute(
    'href',
    '/galeria/rosac',
  )

  await page
    .getByRole('button', { name: 'View full size: Storage of the Base and Azimuth Mechanism' })
    .click()
  const lightbox = page.getByRole('dialog', { name: 'Storage of the Base and Azimuth Mechanism' })
  await expect(lightbox).toBeVisible()
  await expect(
    lightbox.getByText(
      'The main mechanical parts and rotation base are stored in a warehouse before being transported to the site.',
    ),
  ).toBeVisible()
})

test('meets WCAG A and AA checks for the English gallery listing and album', async ({
  context,
  page,
}) => {
  const axe = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])

  await page.goto('/galeria')
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery' })).toBeVisible()
  expect((await axe().analyze()).violations).toEqual([])

  await page.goto('/galeria/rosac')
  await expect(page.getByRole('heading', { level: 1, name: 'ROSAC Photos' })).toBeVisible()
  expect((await axe().analyze()).violations).toEqual([])
})
